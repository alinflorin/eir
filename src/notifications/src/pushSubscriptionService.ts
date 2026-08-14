import type { Collection } from 'mongodb'
import { getDb } from './db.js'
import type { PushSubscription, PushSubscriptionDocument } from './pushSubscription.js'

const COLLECTION = 'pushSubscriptions'

function collection(): Collection<PushSubscriptionDocument> {
  return getDb().collection<PushSubscriptionDocument>(COLLECTION)
}

/**
 * Must be called once after connectDb(), before the collection is used, so
 * the unique index below exists before any writes race to create it.
 */
export async function ensureIndexes(): Promise<void> {
  await collection().createIndex({ endpoint: 1 }, { unique: true })
  await collection().createIndex({ user: 1 })
}

/**
 * Saves (or, keyed on endpoint, re-saves) a user's push subscription.
 * Re-subscribing with the same endpoint updates the keys/expiration in
 * place rather than creating a duplicate. Returns the stored document.
 */
export async function saveSubscription(user: string, subscription: PushSubscription): Promise<PushSubscriptionDocument> {
  const doc = await collection().findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      $set: { ...subscription, user },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: 'after' },
  )
  if (!doc) {
    throw new Error(`failed to save push subscription for endpoint ${subscription.endpoint}`)
  }
  return doc
}

/** Removes a single subscription, e.g. when the browser reports it as gone. */
export async function removeSubscription(endpoint: string): Promise<void> {
  await collection().deleteOne({ endpoint })
}

/** Removes every subscription for a user, e.g. on account deletion. */
export async function removeSubscriptionsForUser(user: string): Promise<void> {
  await collection().deleteMany({ user })
}

/**
 * All of a user's subscriptions (one per browser/device they've enabled push
 * on), oldest first.
 */
export async function getSubscriptionsForUser(user: string): Promise<PushSubscriptionDocument[]> {
  return collection().find({ user }).sort({ createdAt: 1 }).toArray()
}
