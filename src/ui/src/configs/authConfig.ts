import { WebStorageStateStore, type UserManagerSettings } from 'oidc-client-ts'

const { protocol, hostname, origin } = window.location
const baseDomain = hostname.split('.').slice(1).join('.') || hostname

// Dex only understands bare language codes (e.g. "en"), not BCP-47 tags like
// "en-US" that i18next reports, so strip any region/script subtag.
export const toDexLocale = (language: string) => language.split('-')[0]

export const oidcConfig: UserManagerSettings = {
  authority: `${protocol}//dex.${baseDomain}`,
  client_id: 'ui',
  redirect_uri: `${origin}/`,
  scope: 'openid profile email offline_access audience:server:client_id:rabbitmq',
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  post_logout_redirect_uri: `${origin}/`,
}
