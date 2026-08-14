import type { ObjectId } from 'mongodb'
import type { NotificationDto } from '../../domain/notification-list-fetched.js'

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

/** Maps a stored notification to the wire shape sent to the owning user. */
export function toNotificationDto(doc: NotificationDocument): NotificationDto {
  return {
    id: doc._id!.toString(),
    title: doc.title,
    body: doc.body,
    link: doc.link,
    date: doc.date.toISOString(),
    isRead: doc.isRead,
    readDate: doc.readDate?.toISOString(),
  }
}
