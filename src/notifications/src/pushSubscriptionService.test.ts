import { beforeEach, describe, expect, it, vi } from 'vitest'

const createIndex = vi.fn().mockResolvedValue(undefined)
const findOneAndUpdate = vi.fn()
const deleteOne = vi.fn().mockResolvedValue(undefined)
const deleteMany = vi.fn().mockResolvedValue(undefined)
const toArray = vi.fn().mockResolvedValue([])
const sort = vi.fn().mockReturnValue({ toArray })
const find = vi.fn().mockReturnValue({ sort })
const collection = vi.fn().mockReturnValue({ createIndex, findOneAndUpdate, deleteOne, deleteMany, find })
const getDb = vi.fn().mockReturnValue({ collection })

vi.mock('./db.js', () => ({ getDb }))

const {
  ensureIndexes,
  saveSubscription,
  removeSubscription,
  removeSubscriptionsForUser,
  getSubscriptionsForUser,
} = await import('./pushSubscriptionService.js')

const subscription = {
  endpoint: 'https://push.example.com/abc',
  expirationTime: null,
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
}

describe('pushSubscriptionService', () => {
  beforeEach(() => {
    collection.mockClear()
    createIndex.mockClear()
    findOneAndUpdate.mockReset()
    deleteOne.mockClear()
    deleteMany.mockClear()
    find.mockClear()
    sort.mockClear()
    toArray.mockClear()
  })

  it('creates a unique index on endpoint and a lookup index on user', async () => {
    await ensureIndexes()

    expect(createIndex).toHaveBeenCalledWith({ endpoint: 1 }, { unique: true })
    expect(createIndex).toHaveBeenCalledWith({ user: 1 })
  })

  it('upserts a subscription keyed on endpoint and returns the stored document', async () => {
    const stored = { ...subscription, user: 'alice', createdAt: new Date() }
    findOneAndUpdate.mockResolvedValue(stored)

    const result = await saveSubscription('alice', subscription)

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { endpoint: subscription.endpoint },
      {
        $set: { ...subscription, user: 'alice' },
        $setOnInsert: { createdAt: expect.any(Date) },
      },
      { upsert: true, returnDocument: 'after' },
    )
    expect(result).toBe(stored)
  })

  it('throws if the upsert unexpectedly yields no document', async () => {
    findOneAndUpdate.mockResolvedValue(null)

    await expect(saveSubscription('alice', subscription)).rejects.toThrow(/failed to save/)
  })

  it('removes a subscription by endpoint', async () => {
    await removeSubscription(subscription.endpoint)

    expect(deleteOne).toHaveBeenCalledWith({ endpoint: subscription.endpoint })
  })

  it('removes every subscription for a user', async () => {
    await removeSubscriptionsForUser('alice')

    expect(deleteMany).toHaveBeenCalledWith({ user: 'alice' })
  })

  it('returns a user\'s subscriptions sorted oldest-first', async () => {
    const docs = [{ ...subscription, user: 'alice', createdAt: new Date() }]
    toArray.mockResolvedValue(docs)

    const result = await getSubscriptionsForUser('alice')

    expect(find).toHaveBeenCalledWith({ user: 'alice' })
    expect(sort).toHaveBeenCalledWith({ createdAt: 1 })
    expect(result).toBe(docs)
  })
})
