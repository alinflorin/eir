import { getConfig } from './config.js'

// Refresh this many seconds before actual expiry, to cover request latency.
const EXPIRY_MARGIN_SECONDS = 30

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope?: string
}

interface CachedToken {
  accessToken: string
  expiresAt: number
}

let cached: CachedToken | undefined
let inFlight: Promise<CachedToken> | undefined

/**
 * Returns a cached access token from dex, re-authenticating as this
 * service's static client (client_credentials grant) once it's expired
 * or about to. There's no refresh token in this flow — dex rejects
 * offline_access for client_credentials — so renewal just means repeating
 * the original request with the client secret.
 */
export async function getAccessToken(): Promise<string> {
  return (await getToken()).accessToken
}

/**
 * Same as getAccessToken, but also returns the (margin-adjusted) expiry so
 * callers holding a long-lived connection can proactively renew it.
 */
export async function getToken(): Promise<CachedToken> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached
  }

  // Coalesce concurrent callers into a single token request.
  if (!inFlight) {
    inFlight = fetchAccessToken().finally(() => { inFlight = undefined })
  }
  return inFlight
}

async function fetchAccessToken(): Promise<CachedToken> {
  const { serviceName, clientSecret, tokenUrl } = getConfig()
  if (!clientSecret) {
    throw new Error(`${serviceName.toUpperCase()}_CLIENT_SECRET is not set`)
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: serviceName,
    client_secret: clientSecret,
    // Both audiences are required: 'rabbitmq' satisfies rabbitmq.conf's
    // resource_server_id check (needed just to authenticate at all), while
    // 'rabbitmq-service' is what triggers the broader scope alias.
    scope: 'openid profile email audience:server:client_id:rabbitmq audience:server:client_id:rabbitmq-service',
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`failed to acquire access token (${response.status}): ${text}`)
  }

  const token = (await response.json()) as TokenResponse
  cached = {
    accessToken: token.access_token,
    expiresAt: Date.now() + (token.expires_in - EXPIRY_MARGIN_SECONDS) * 1000,
  }
  return cached
}
