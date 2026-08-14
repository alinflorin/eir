import { beforeEach, describe, expect, it, vi } from 'vitest'

class WebPushError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
  }
}

const setVapidDetails = vi.fn()
const sendNotification = vi.fn()
const getSubscriptionsForUser = vi.fn()
const removeSubscription = vi.fn()

vi.mock('web-push', () => ({
  default: { setVapidDetails, sendNotification },
  WebPushError,
}))
vi.mock('./pushSubscriptionService.js', () => ({ getSubscriptionsForUser, removeSubscription }))

const subscriptionA = {
  endpoint: 'https://push.example.com/a',
  expirationTime: null,
  keys: { p256dh: 'p-a', auth: 'a-a' },
  user: 'alice',
  createdAt: new Date(),
}
const subscriptionB = {
  endpoint: 'https://push.example.com/b',
  expirationTime: null,
  keys: { p256dh: 'p-b', auth: 'a-b' },
  user: 'alice',
  createdAt: new Date(),
}

// vapidConfigured (here) and config (in config.js) are both module-level
// singletons, so each test that cares about that state gets a fresh
// instance of both, imported together so configure() lands on the same
// config instance pushNotificationService.js reads from.
async function freshSendPushNotification() {
  vi.resetModules()
  const { configure } = await import('./config.js')
  configure('notifications')
  const { sendPushNotification } = await import('./pushNotificationService.js')
  return sendPushNotification
}

describe('pushNotificationService', () => {
  beforeEach(() => {
    setVapidDetails.mockClear()
    sendNotification.mockReset().mockResolvedValue(undefined)
    getSubscriptionsForUser.mockReset().mockResolvedValue([subscriptionA])
    removeSubscription.mockReset().mockResolvedValue(undefined)
    process.env.VAPID_PUBLIC_KEY = 'public-key'
    process.env.VAPID_PRIVATE_KEY = 'private-key'
  })

  it('throws when VAPID keys are not configured', async () => {
    delete process.env.VAPID_PUBLIC_KEY
    delete process.env.VAPID_PRIVATE_KEY
    const sendPushNotification = await freshSendPushNotification()

    await expect(sendPushNotification('alice', 'Hi', 'body')).rejects.toThrow(/VAPID/)
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('throws when the user has no subscriptions', async () => {
    getSubscriptionsForUser.mockResolvedValue([])
    const sendPushNotification = await freshSendPushNotification()

    await expect(sendPushNotification('alice', 'Hi', 'body')).rejects.toThrow(/no push subscriptions/)
  })

  it('sends the payload to every subscription the user has', async () => {
    getSubscriptionsForUser.mockResolvedValue([subscriptionA, subscriptionB])
    const sendPushNotification = await freshSendPushNotification()

    await sendPushNotification('alice', 'Hi', 'body', 'https://eir.localhost')

    expect(sendNotification).toHaveBeenCalledTimes(2)
    expect(sendNotification).toHaveBeenCalledWith(
      { endpoint: subscriptionA.endpoint, expirationTime: subscriptionA.expirationTime, keys: subscriptionA.keys },
      JSON.stringify({ title: 'Hi', body: 'body', link: 'https://eir.localhost' }),
    )
  })

  it('prunes a subscription the push service reports as gone (410) and does not throw if others succeed', async () => {
    getSubscriptionsForUser.mockResolvedValue([subscriptionA, subscriptionB])
    sendNotification.mockImplementation((subscription: { endpoint: string }) => {
      if (subscription.endpoint === subscriptionA.endpoint) {
        return Promise.reject(new WebPushError('gone', 410))
      }
      return Promise.resolve(undefined)
    })
    const sendPushNotification = await freshSendPushNotification()

    await sendPushNotification('alice', 'Hi', 'body')

    expect(removeSubscription).toHaveBeenCalledWith(subscriptionA.endpoint)
    expect(removeSubscription).not.toHaveBeenCalledWith(subscriptionB.endpoint)
  })

  it('does not prune on a non-gone error', async () => {
    sendNotification.mockRejectedValue(new WebPushError('server error', 500))
    getSubscriptionsForUser.mockResolvedValue([subscriptionA, subscriptionB])
    const sendPushNotification = await freshSendPushNotification()

    await expect(sendPushNotification('alice', 'Hi', 'body')).rejects.toThrow(/failed to deliver/)
    expect(removeSubscription).not.toHaveBeenCalled()
  })

  it('throws only when every subscription fails to deliver', async () => {
    sendNotification.mockRejectedValue(new Error('network error'))
    const sendPushNotification = await freshSendPushNotification()

    await expect(sendPushNotification('alice', 'Hi', 'body')).rejects.toThrow(/failed to deliver push notification to any/)
  })

  it('configures VAPID details only once across multiple calls', async () => {
    getSubscriptionsForUser.mockResolvedValue([subscriptionA])
    const sendPushNotification = await freshSendPushNotification()

    await sendPushNotification('alice', 'Hi', 'body')
    await sendPushNotification('alice', 'Hi again', 'body')

    expect(setVapidDetails).toHaveBeenCalledOnce()
  })
})
