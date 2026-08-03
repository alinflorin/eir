import { WebStorageStateStore, type UserManagerSettings } from 'oidc-client-ts'

const { protocol, hostname, origin } = window.location
const baseDomain = hostname.split('.').slice(1).join('.') || hostname

export const oidcConfig: UserManagerSettings = {
  authority: `${protocol}//dex.${baseDomain}`,
  client_id: 'ui',
  redirect_uri: `${origin}/oauth/callback`,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
}
