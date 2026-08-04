import amqp, { type ChannelModel } from 'amqplib'
import { getToken } from './auth.js'

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://rabbitmq:5672'

const INITIAL_RECONNECT_DELAY_MS = 1_000
const MAX_RECONNECT_DELAY_MS = 30_000

let reconnectDelay = INITIAL_RECONNECT_DELAY_MS
let renewalTimer: NodeJS.Timeout | undefined

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
    connection = await amqp.connect(RABBITMQ_URL, {
      credentials: amqp.credentials.plain('', token.accessToken),
    })
  } catch (err) {
    console.error('failed to connect to rabbitmq, retrying', err)
    scheduleReconnect()
    return
  }

  console.log('connected to rabbitmq')
  reconnectDelay = INITIAL_RECONNECT_DELAY_MS

  connection.on('error', (err) => console.error('rabbitmq connection error', err))
  connection.on('close', () => {
    console.log('rabbitmq connection closed, reconnecting')
    clearRenewalTimer()
    scheduleReconnect()
  })

  scheduleRenewal(connection, token.expiresAt)
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
