import { AllNotificationsMarkedAsRead } from '../../domain/all-notifications-marked-as-read.js'
import { AllNotificationsMarkedAsReadRequested } from '../../domain/all-notifications-marked-as-read-requested.js'
import { ExceptionOccurred } from '../../domain/exception-occurred.js'
import { NotificationListFetched } from '../../domain/notification-list-fetched.js'
import { NotificationListRequested } from '../../domain/notification-list-requested.js'
import { NotificationMarkAsReadRequested } from '../../domain/notification-mark-as-read-requested.js'
import { NotificationMarkedAsRead } from '../../domain/notification-marked-as-read.js'
import { consumeAny, onConnect, publish } from './eventBus.js'
import { getNotifications, markAllAsRead, markAsRead } from './notificationService.js'
import { toNotificationDto } from './notification.js'

const MAX_PAGE_SIZE = 100

/**
 * Registers this service's notification-list consumers. All three requests
 * come from users acting on their own notifications, not services, so
 * they're bound with consumeAny(..., 'users', ...).
 *
 * Registration happens inside onConnect since the underlying queue
 * bindings live on the rabbitmq channel, which is replaced on every
 * reconnect.
 */
export function startNotificationListConsumers(): void {
  onConnect(() => {
    void consumeAny(NotificationListRequested, 'users', (request, user) => {
      void handleListRequested(request, user)
    })

    void consumeAny(NotificationMarkAsReadRequested, 'users', (request, user) => {
      void handleMarkAsReadRequested(request, user)
    })

    void consumeAny(AllNotificationsMarkedAsReadRequested, 'users', (_request, user) => {
      void handleAllMarkedAsReadRequested(user)
    })
  })
}

async function handleListRequested(request: NotificationListRequested, user: string): Promise<void> {
  try {
    const page = Math.max(request.page, 1)
    const pageSize = Math.min(Math.max(request.pageSize, 1), MAX_PAGE_SIZE)
    const { notifications, totalCount, unreadCount } = await getNotifications(user, page, pageSize)
    publish(new NotificationListFetched(notifications.map(toNotificationDto), page, pageSize, totalCount, unreadCount), { user })
  } catch (err) {
    reportException('failed to fetch notifications', err, user)
  }
}

async function handleMarkAsReadRequested(request: NotificationMarkAsReadRequested, user: string): Promise<void> {
  try {
    await markAsRead(user, request.notificationId)
    publish(new NotificationMarkedAsRead(request.notificationId), { user })
  } catch (err) {
    reportException('failed to mark notification as read', err, user)
  }
}

async function handleAllMarkedAsReadRequested(user: string): Promise<void> {
  try {
    await markAllAsRead(user)
    publish(new AllNotificationsMarkedAsRead(), { user })
  } catch (err) {
    reportException('failed to mark all notifications as read', err, user)
  }
}

function reportException(context: string, err: unknown, user: string): void {
  console.error(context, err)
  publish(new ExceptionOccurred(err instanceof Error ? err.message : String(err)), { user })
}
