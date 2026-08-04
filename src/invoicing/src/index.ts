import { getAccessToken } from './auth.js'

console.log('invoicing service starting')

const token = await getAccessToken()
console.log(`acquired access token from dex (${token.length} chars)`)

setInterval(() => { console.log('invoicing live')}, 1000);
