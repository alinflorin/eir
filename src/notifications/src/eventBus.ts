import amqp, { type Channel, type ChannelModel } from 'amqplib'
import { getToken } from './auth.js'
import { getConfig } from './config.js'

// Same exchange the rabbitmq_mqtt plugin publishes/subscribes MQTT topics
// through, so messages published here natively are delivered to (and
// messages from) the UI's useEventBus MQTT clients.
const EXCHANGE = 'amq.topic'

// Every routing key lives under one of these two top-level namespaces,
// mirroring the UI's `users/<userName>/<topic>` MQTT topics (rabbitmq_mqtt
// translates '/' <-> '.' at the MQTT boundary) plus a `services/<serviceName>/<topic>`
// counterpart for service-to-service traffic. See rabbitmq.conf: the ui's
// scope alias is locked to its own `users.{name}.*`, while the
// rabbitmq-service alias (used here) has free rein over both.
type PublishTarget = { user: string } | { service: string }

function targetPrefix(target: PublishTarget): string {
  return 'user' in target ? `users.${target.user}` : `services.${target.service}`
}

const INITIAL_RECONNECT_DELAY_MS = 1_000
const MAX_RECONNECT_DELAY_MS = 30_000

let reconnectDelay = INITIAL_RECONNECT_DELAY_MS
let renewalTimer: NodeJS.Timeout | undefined

// Set once connected; cleared on disconnect.
let channel: Channel | undefined

// Queue bindings live on the channel, which is torn down and replaced on
// every reconnect — so consumers registered here are re-bound after each
// (re)connect rather than just once at startup.
const connectListeners = new Set<() => void>()

/**
 * Registers a callback to (re-)run every time a rabbitmq connection is
 * established, including after reconnects. Use this to set up `consume`/
 * `consumeAny` subscriptions, since they're bound to a channel that doesn't
 * survive a reconnect.
 */
export function onConnect(listener: () => void): void {
  connectListeners.add(listener)
  if (channel) listener()
}

/**
 * Connects to rabbitmq using the "notifications" access token as the SASL PLAIN
 * password, per the rabbitmq_auth_backend_oauth2 plugin (see rabbitmq.conf).
 * The username is unused by that backend, so it's left blank.
 *
 * Manages the connection for the lifetime of the process: reconnects with
 * exponential backoff (uncapped retries) on any drop, and proactively
 * disconnects/renews shortly before the access token expires rather than
 * waiting for rabbitmq to reject it.
 */
export function startRabbitMQ(): void {
  void connect()
}

async function connect(): Promise<void> {
  let token
  try {
    token = await getToken()
  } catch (err) {
    console.error('failed to acquire access token for rabbitmq, retrying', err)
    scheduleReconnect()
    return
  }

  let connection: ChannelModel
  try {
    connection = await amqp.connect(getConfig().rabbitmqUrl, {
      credentials: amqp.credentials.plain('', token.accessToken),
    })
  } catch (err) {
    console.error('failed to connect to rabbitmq, retrying', err)
    scheduleReconnect()
    return
  }

  console.log('connected to rabbitmq')
  reconnectDelay = INITIAL_RECONNECT_DELAY_MS
  channel = await connection.createChannel()
  connectListeners.forEach((listener) => listener())

  connection.on('error', (err) => console.error('rabbitmq connection error', err))
  connection.on('close', () => {
    console.log('rabbitmq connection closed, reconnecting')
    channel = undefined
    clearRenewalTimer()
    scheduleReconnect()
  })

  scheduleRenewal(connection, token.expiresAt)
}

/**
 * Publishes a message keyed by the payload's class name, under either a
 * user's or a service's topic namespace depending on `target`:
 *   publish(payload, { user: 'alice' })      -> users.alice.ClassName
 *   publish(payload, { service: 'notifications' }) -> services.notifications.ClassName
 * Defaults to this service's own namespace (`getConfig().serviceName`) when
 * no target is given, e.g. for a service announcing its own events.
 * Routing keys use '.' natively (rabbitmq_mqtt translates '/' <-> '.' at
 * the MQTT boundary), so `{ user: 'alice' }` reaches MQTT subscribers on
 * `users/alice/ClassName`.
 */
export function publish<T extends object>(payload: T, target?: PublishTarget): void {
  if (!channel) {
    console.warn('Cannot publish: not connected to rabbitmq')
    return
  }
  const routingKey = `${targetPrefix(target ?? { service: getConfig().serviceName })}.${payload.constructor.name}`
  // persistent: true so messages sitting in the now-durable bound queues
  // (see bind()) survive a broker restart during their 1-minute TTL.
  channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true })
}

/**
 * Subscribes to messages of the given class published under this service's
 * own namespace (`services.<serviceName>.ClassName`, e.g. a reply addressed
 * specifically to this service). Returns a function that cancels the
 * subscription. Identical scheme to useEventBus's subscribe, but over a
 * dedicated durable queue rather than an MQTT session.
 */
export async function consume<T extends object>(
  type: new (...args: never[]) => T,
  onMessage: (payload: T) => void,
  ttlMs?: number,
): Promise<() => void> {
  if (!channel) {
    console.warn('Cannot consume: not connected to rabbitmq')
    return () => {}
  }
  return bind(`services.${getConfig().serviceName}.${type.name}`, (payload: T) => onMessage(payload), ttlMs)
}

/**
 * Subscribes to messages of the given class published under *any* user's or
 * *any* service's topic namespace (routing key `users.*.ClassName` or
 * `services.*.ClassName` — AMQP's topic-exchange '*' matches exactly one
 * word, i.e. one username/serviceName segment). Useful for a service like
 * notifications that reacts to requests from any user, rather than one scoped
 * to its own namespace. Backend services get free rein over both
 * namespaces (see rabbitmq.conf's rabbitmq-service scope alias) — the
 * frontend cannot do this at all, it's scoped to its own user namespace only.
 */
export async function consumeAny<T extends object>(
  type: new (...args: never[]) => T,
  from: 'users' | 'services',
  onMessage: (payload: T, name: string) => void,
  ttlMs?: number,
): Promise<() => void> {
  return bind(`${from}.*.${type.name}`, (payload: T, routingKey: string) => {
    const name = routingKey.split('.')[1]
    if (name === undefined) throw new Error(`malformed routing key: ${routingKey}`)
    onMessage(payload, name)
  }, ttlMs)
}

async function bind<T extends object>(
  routingKey: string,
  onMessage: (payload: T, routingKey: string) => void,
  ttlMs?: number,
): Promise<() => void> {
  if (!channel) {
    console.warn('Cannot consume: not connected to rabbitmq')
    return () => {}
  }

  const ch = channel
  // Named, durable, non-exclusive queue (rather than a private auto-delete
  // one) so messages published while every consumer is offline are still
  // stored in the broker instead of being dropped. Optionally capped with
  // x-message-ttl so a queue with no consumer for a while doesn't grow
  // unbounded.
  const queue = routingKey
  await ch.assertQueue(queue, {
    durable: true,
    arguments: ttlMs === undefined ? {} : { 'x-message-ttl': ttlMs },
  })
  await ch.bindQueue(queue, EXCHANGE, routingKey)

  const { consumerTag } = await ch.consume(queue, (msg) => {
    if (!msg) return
    onMessage(JSON.parse(msg.content.toString()) as T, msg.fields.routingKey)
    ch.ack(msg)
  })

  return () => {
    ch.cancel(consumerTag).catch((err) => console.error('failed to cancel rabbitmq consumer', err))
  }
}

function scheduleRenewal(connection: ChannelModel, expiresAt: number): void {
  clearRenewalTimer()
  const delay = Math.max(expiresAt - Date.now(), 0)
  renewalTimer = setTimeout(() => {
    console.log('access token nearing expiry, disconnecting rabbitmq to renew')
    // Triggers the 'close' handler above, which reconnects and fetches a
    // fresh token in the process (the cached one is expired by then).
    connection.close().catch((err) => console.error('error closing rabbitmq connection for renewal', err))
  }, delay)
}

function clearRenewalTimer(): void {
  if (renewalTimer) {
    clearTimeout(renewalTimer)
    renewalTimer = undefined
  }
}

function scheduleReconnect(): void {
  const delay = reconnectDelay
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS)
  setTimeout(() => { void connect() }, delay)
}
