import webpush, { WebPushError } from 'web-push'
import { getConfig } from './config.js'
import { getSubscriptionsForUser, removeSubscription } from './pushSubscriptionService.js'

let vapidConfigured = false

function ensureVapidConfigured(): void {
  if (vapidConfigured) return
  const { vapidSubject, vapidPublicKey, vapidPrivateKey } = getConfig()
  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY are not set')
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
  vapidConfigured = true
}

/**
 * Sends a push notification to every subscription a user has registered
 * (one per browser/device). Subscriptions the push service reports as gone
 * (404/410, e.g. the user uninstalled/unsubscribed) are pruned automatically.
 * Throws if none of the user's subscriptions could be delivered to.
 */
export async function sendPushNotification(user: string, title: string, body: string, link?: string): Promise<void> {
  ensureVapidConfigured()

  const subscriptions = await getSubscriptionsForUser(user)
  if (subscriptions.length === 0) {
    throw new Error(`user ${user} has no push subscriptions`)
  }

  const payload = JSON.stringify({ title, body, link })

  const outcomes = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, expirationTime: subscription.expirationTime, keys: subscription.keys },
          payload,
        )
      } catch (err) {
        if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
          await removeSubscription(subscription.endpoint)
        }
        throw err
      }
    }),
  )

  const failures = outcomes.filter((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected')
  if (failures.length === outcomes.length) {
    const reasons = failures.map((failure) => String(failure.reason)).join('; ')
    throw new Error(`failed to deliver push notification to any of ${user}'s subscriptions: ${reasons}`)
  }
}
