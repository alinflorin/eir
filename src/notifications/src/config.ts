/**
 * Central place for this service's identity and connection settings.
 *
 * When copying this service as a template for a new one, `configure()` in
 * index.ts is the *only* place that should need editing — everything else
 * (auth.ts, eventBus.ts, ...) reads from `getConfig()` instead of hardcoding
 * a service name or env var.
 */

export interface Config {
  /** Also doubles as the dex client_id and the prefix of the client secret env var. */
  serviceName: string
  tokenUrl: string
  clientSecret: string | undefined
  rabbitmqUrl: string
}

let config: Config | undefined

/**
 * Must be called once, before anything else runs (first line of index.ts).
 */
export function configure(serviceName: string): void {
  config = {
    serviceName,
    tokenUrl: process.env.DEX_TOKEN_URL ?? 'http://dex:5556/token',
    clientSecret: process.env[`CLIENT_SECRET`],
    rabbitmqUrl: process.env.RABBITMQ_URL ?? 'amqp://rabbitmq:5672',
  }
}

export function getConfig(): Config {
  if (!config) {
    throw new Error('config not initialized: call configure() before using this module')
  }
  return config
}
