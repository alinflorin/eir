import { WebStorageStateStore, type UserManagerSettings } from 'oidc-client-ts'

const { protocol, hostname, origin } = window.location
const baseDomain = hostname.split('.').slice(1).join('.') || hostname

export const oidcConfig: UserManagerSettings = {
  authority: `${protocol}//dex.${baseDomain}`,
  client_id: 'ui',
  redirect_uri: `${origin}/oauth/callback`,
  scope: 'openid profile email offline_access audience:server:client_id:rabbitmq',
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
}
