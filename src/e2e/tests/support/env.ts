// Small helper so a missing/blank env var fails fast with a clear message
// at the point of use, instead of Playwright silently navigating to
// "undefined" or typing an empty password.
export function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required env var ${name} — copy src/e2e/.env.example to ` +
        `src/e2e/.env and fill it in.`,
    )
  }
  return value
}
