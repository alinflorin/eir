import { ObjectId, type Collection } from 'mongodb'
import { getDb } from './db.js'
import type { NotificationDocument } from './notification.js'

const COLLECTION = 'notifications'

function collection(): Collection<NotificationDocument> {
  return getDb().collection<NotificationDocument>(COLLECTION)
}

/**
 * Must be called once after connectDb(), before the collection is used, so
 * these indexes exist before any writes/reads race to use them.
 */
export async function ensureIndexes(): Promise<void> {
  await collection().createIndex({ userName: 1, date: -1 })
  await collection().createIndex({ userName: 1, isRead: 1 })
}

/** Stores a new notification as unread. Returns the stored document. */
export async function saveNotification(userName: string, title: string, body: string, link?: string): Promise<NotificationDocument> {
  const doc: NotificationDocument = { userName, title, body, link, date: new Date(), isRead: false, readDate: null }
  const { insertedId } = await collection().insertOne(doc)
  return { ...doc, _id: insertedId }
}

export interface NotificationPage {
  notifications: NotificationDocument[]
  totalCount: number
  unreadCount: number
}

/**
 * A page of a user's notifications, newest first, alongside the total
 * number of notifications and how many of them are unread — both counted
 * across the user's entire history, not just the returned page.
 */
export async function getNotifications(userName: string, page: number, pageSize: number): Promise<NotificationPage> {
  const skip = (page - 1) * pageSize
  const [notifications, totalCount, unreadCount] = await Promise.all([
    collection().find({ userName }).sort({ date: -1 }).skip(skip).limit(pageSize).toArray(),
    collection().countDocuments({ userName }),
    collection().countDocuments({ userName, isRead: false }),
  ])
  return { notifications, totalCount, unreadCount }
}

/** Marks a single notification as read, scoped to its owner so users can't mark each other's. */
export async function markAsRead(userName: string, notificationId: string): Promise<void> {
  await collection().updateOne(
    { _id: new ObjectId(notificationId), userName },
    { $set: { isRead: true, readDate: new Date() } },
  )
}

/** Marks every unread notification belonging to a user as read. */
export async function markAllAsRead(userName: string): Promise<void> {
  await collection().updateMany({ userName, isRead: false }, { $set: { isRead: true, readDate: new Date() } })
}
