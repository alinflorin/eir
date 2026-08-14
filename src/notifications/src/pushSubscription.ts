/**
 * Shape of the standard PushSubscription JSON, as produced by the browser's
 * PushManager.subscribe() (pushSubscription.toJSON()) and required by
 * web-push to send a notification.
 */
export interface PushSubscriptionKeys {
  p256dh: string
  auth: string
}

export interface PushSubscription {
  endpoint: string
  expirationTime: number | null
  keys: PushSubscriptionKeys
}

/** What's actually stored in mongo: a subscription plus who it belongs to. */
export interface PushSubscriptionDocument extends PushSubscription {
  user: string
  createdAt: Date
}
