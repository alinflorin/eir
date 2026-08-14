import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'

const createIndex = vi.fn().mockResolvedValue(undefined)
const insertOne = vi.fn()
const toArray = vi.fn().mockResolvedValue([])
const limit = vi.fn().mockReturnValue({ toArray })
const skip = vi.fn().mockReturnValue({ limit })
const sort = vi.fn().mockReturnValue({ skip })
const find = vi.fn().mockReturnValue({ sort })
const countDocuments = vi.fn().mockResolvedValue(0)
const updateOne = vi.fn().mockResolvedValue(undefined)
const updateMany = vi.fn().mockResolvedValue(undefined)
const collection = vi.fn().mockReturnValue({ createIndex, insertOne, find, countDocuments, updateOne, updateMany })
const getDb = vi.fn().mockReturnValue({ collection })

vi.mock('./db.js', () => ({ getDb }))

const { ensureIndexes, saveNotification, getNotifications, markAsRead, markAllAsRead } = await import('./notificationService.js')

describe('notificationService', () => {
  beforeEach(() => {
    collection.mockClear()
    createIndex.mockClear()
    insertOne.mockReset()
    find.mockClear()
    sort.mockClear()
    skip.mockClear()
    limit.mockClear()
    toArray.mockClear().mockResolvedValue([])
    countDocuments.mockClear().mockResolvedValue(0)
    updateOne.mockClear()
    updateMany.mockClear()
  })

  it('creates a lookup index on userName+date and one on userName+isRead', async () => {
    await ensureIndexes()

    expect(createIndex).toHaveBeenCalledWith({ userName: 1, date: -1 })
    expect(createIndex).toHaveBeenCalledWith({ userName: 1, isRead: 1 })
  })

  it('inserts a new notification as unread and returns the stored document', async () => {
    const insertedId = new ObjectId()
    insertOne.mockResolvedValue({ insertedId })

    const result = await saveNotification('alice', 'Hi', 'body', 'https://eir.localhost')

    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        userName: 'alice',
        title: 'Hi',
        body: 'body',
        link: 'https://eir.localhost',
        isRead: false,
        readDate: null,
        date: expect.any(Date),
      }),
    )
    expect(result).toMatchObject({ _id: insertedId, userName: 'alice', title: 'Hi', isRead: false })
  })

  it('fetches a page of notifications alongside total and unread counts', async () => {
    const docs = [{ _id: new ObjectId(), userName: 'alice', title: 'Hi', body: 'body', date: new Date(), isRead: false, readDate: null }]
    toArray.mockResolvedValue(docs)
    countDocuments.mockResolvedValueOnce(42).mockResolvedValueOnce(7)

    const result = await getNotifications('alice', 2, 10)

    expect(find).toHaveBeenCalledWith({ userName: 'alice' })
    expect(sort).toHaveBeenCalledWith({ date: -1 })
    expect(skip).toHaveBeenCalledWith(10)
    expect(limit).toHaveBeenCalledWith(10)
    expect(countDocuments).toHaveBeenCalledWith({ userName: 'alice' })
    expect(countDocuments).toHaveBeenCalledWith({ userName: 'alice', isRead: false })
    expect(result).toEqual({ notifications: docs, totalCount: 42, unreadCount: 7 })
  })

  it('skips zero notifications on the first page', async () => {
    await getNotifications('alice', 1, 20)

    expect(skip).toHaveBeenCalledWith(0)
  })

  it('marks a single notification as read, scoped to its owner', async () => {
    const id = new ObjectId()

    await markAsRead('alice', id.toString())

    expect(updateOne).toHaveBeenCalledWith(
      { _id: id, userName: 'alice' },
      { $set: { isRead: true, readDate: expect.any(Date) } },
    )
  })

  it('marks every unread notification for a user as read', async () => {
    await markAllAsRead('alice')

    expect(updateMany).toHaveBeenCalledWith(
      { userName: 'alice', isRead: false },
      { $set: { isRead: true, readDate: expect.any(Date) } },
    )
  })
})
