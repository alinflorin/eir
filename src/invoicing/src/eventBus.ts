import amqp, { type Channel, type ChannelModel } from 'amqplib'
import { getToken } from './auth.js'
import { getConfig } from './config.js'

// Same exchange the rabbitmq_mqtt plugin publishes/subscribes MQTT topics
// through, so messages published here natively are delivered to (and
// messages from) the UI's useEventBus MQTT clients.
const EXCHANGE = 'amq.topic'

const INITIAL_RECONNECT_DELAY_MS = 1_000
const MAX_RECONNECT_DELAY_MS = 30_000

let reconnectDelay = INITIAL_RECONNECT_DELAY_MS
let renewalTimer: NodeJS.Timeout | undefined

// Set once connected; cleared on disconnect. `username` is the "name" claim
// from the access token, mirroring the UI's use of the OIDC profile's name
// as the per-user topic namespace (see useEventBus.ts).
let channel: Channel | undefined
let username: string | undefined

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
 * Connects to rabbitmq using the "invoicing" access token as the SASL PLAIN
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
  username = decodeNameClaim(token.accessToken)
  channel = await connection.createChannel()
  connectListeners.forEach((listener) => listener())

  connection.on('error', (err) => console.error('rabbitmq connection error', err))
  connection.on('close', () => {
    console.log('rabbitmq connection closed, reconnecting')
    channel = undefined
    username = undefined
    clearRenewalTimer()
    scheduleReconnect()
  })

  scheduleRenewal(connection, token.expiresAt)
}

/**
 * Extracts the "name" claim from the (unverified) access token payload —
 * rabbitmq already validated the token's signature on connect, so this is
 * just reading a claim off a token we trust, the same claim the UI reads
 * from the OIDC profile (see App.tsx/useEventBus.ts).
 */
function decodeNameClaim(accessToken: string): string {
  const payload = accessToken.split('.')[1]
  if (!payload) {
    throw new Error('malformed access token: missing JWT payload segment')
  }
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>
  if (typeof claims.name !== 'string') {
    throw new Error('access token missing "name" claim')
  }
  return claims.name
}

/**
 * Publishes a message under a user's topic namespace, keyed by the
 * payload's class name — identical scheme to useEventBus's publish.
 * Defaults to the current (service account's) username; pass
 * targetUsername to publish into a different user's namespace instead
 * (e.g. a service replying to the user who made a request).
 * Routing keys use '.' natively (rabbitmq_mqtt translates '/' <-> '.' at
 * the MQTT boundary), so this reaches MQTT subscribers on `${username}/${ClassName}`.
 */
export function publish<T extends object>(payload: T, targetUsername?: string): void {
  const target = targetUsername ?? username
  if (!channel || !target) {
    console.warn('Cannot publish: not connected to rabbitmq')
    return
  }
  const routingKey = `${target}.${payload.constructor.name}`
  // persistent: true so messages sitting in the now-durable bound queues
  // (see bind()) survive a broker restart during their 1-minute TTL.
  channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true })
}

/**
 * Subscribes to messages of the given class, published under the current
 * user's topic namespace. Returns a function that cancels the subscription.
 * Identical scheme to useEventBus's subscribe, but over a dedicated
 * exclusive/auto-delete queue rather than an MQTT session.
 */
export async function consume<T extends object>(
  type: new (...args: never[]) => T,
  onMessage: (payload: T) => void,
  durable: boolean,
): Promise<() => void> {
  if (!username) {
    console.warn('Cannot consume: not connected to rabbitmq')
    return () => {}
  }
  return bind(`${username}.${type.name}`, (payload: T) => onMessage(payload), durable)
}

/**
 * Subscribes to messages of the given class published under *any* user's
 * topic namespace (routing key `*.ClassName` — AMQP's topic-exchange '*'
 * matches exactly one word, i.e. one username segment). Useful for a
 * service like invoicing that reacts to requests from any user, rather
 * than one scoped to its own service account's namespace.
 */
export async function consumeAny<T extends object>(
  type: new (...args: never[]) => T,
  onMessage: (payload: T, fromUsername: string) => void,
  durable: boolean,
): Promise<() => void> {
  return bind(`*.${type.name}`, (payload: T, routingKey: string) => {
    onMessage(payload, routingKey.slice(0, routingKey.lastIndexOf('.')))
  }, durable)
}

async function bind<T extends object>(
  routingKey: string,
  onMessage: (payload: T, routingKey: string) => void,
  durable: boolean,
): Promise<() => void> {
  if (!channel) {
    console.warn('Cannot consume: not connected to rabbitmq')
    return () => {}
  }

  const ch = channel
  // Named, non-exclusive queue (rather than a private auto-delete one) so
  // messages published while every consumer is offline are still stored in
  // the broker instead of being dropped. Messages still expire after a
  // minute (x-message-ttl) so a queue with no consumer for a while doesn't
  // grow unbounded. `durable` controls whether the queue itself survives a
  // broker restart.
  const queue = routingKey
  await ch.assertQueue(queue, { durable })
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
