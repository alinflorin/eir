import type { ObjectId } from 'mongodb'

/** What's stored in mongo: a single in-app notification for one user. */
export interface NotificationDocument {
  _id?: ObjectId
  userName: string
  title: string
  body: string
  link?: string
  date: Date
  isRead: boolean
  readDate: Date | null
}
