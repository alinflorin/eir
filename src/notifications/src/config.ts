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
  mongoUrl: string
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string | undefined
  smtpPassword: string | undefined
  fromAddress: string
  fromName: string
  vapidSubject: string
  vapidPublicKey: string | undefined
  vapidPrivateKey: string | undefined
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
    mongoUrl:
      process.env.MONGO_URL ??
      `mongodb://${process.env.MONGO_USER ?? 'root'}:${process.env.MONGO_ROOT_PASSWORD}@${process.env.MONGO_HOST ?? 'mongodb'}:${process.env.MONGO_PORT ?? 27017}`,
    smtpHost: process.env.SMTP_HOST ?? 'smtp',
    smtpPort: Number(process.env.SMTP_PORT ?? 1025),
    // The dummy dev SMTP server speaks plaintext, not TLS.
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    fromAddress: process.env.FROM_ADDRESS ?? 'notifications@eir.localhost',
    fromName: process.env.FROM_NAME ?? 'Eir Notifications',
    vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:notifications@eir.localhost',
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  }
}

export function getConfig(): Config {
  if (!config) {
    throw new Error('config not initialized: call configure() before using this module')
  }
  return config
}
