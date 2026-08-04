const TOKEN_URL = process.env.DEX_TOKEN_URL ?? 'http://dex:5556/token'
const CLIENT_ID = 'invoicing'
const CLIENT_SECRET = process.env.INVOICING_CLIENT_SECRET

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope?: string
}

/**
 * Acquires an access token from dex using the client_credentials grant,
 * authenticating as the "invoicing" static client.
 */
export async function getAccessToken(): Promise<string> {
  if (!CLIENT_SECRET) {
    throw new Error('INVOICING_CLIENT_SECRET is not set')
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'openid profile email audience:server:client_id:rabbitmq',
  })

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`failed to acquire access token (${response.status}): ${text}`)
  }

  const token = (await response.json()) as TokenResponse
  return token.access_token
}
