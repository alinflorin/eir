import { useCallback, useEffect, useState } from 'react'
import { AllNotificationsMarkedAsRead } from '../../../domain/all-notifications-marked-as-read'
import { AllNotificationsMarkedAsReadRequested } from '../../../domain/all-notifications-marked-as-read-requested'
import { NotificationAdded } from '../../../domain/notification-added'
import { NotificationListFetched, type NotificationDto } from '../../../domain/notification-list-fetched'
import { NotificationListRequested } from '../../../domain/notification-list-requested'
import { NotificationMarkAsReadRequested } from '../../../domain/notification-mark-as-read-requested'
import { NotificationMarkedAsRead } from '../../../domain/notification-marked-as-read'
import { useEventBus } from './useEventBus'

const PAGE_SIZE = 10

export interface UseNotificationsResult {
  notifications: NotificationDto[]
  unreadCount: number
  totalCount: number
  isLoading: boolean
  hasMore: boolean
  loadMore: () => void
  refresh: () => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
}

/**
 * Keeps a user's in-app notification list in sync entirely over the event
 * bus (no REST), via NotificationListRequested/NotificationListFetched and
 * the mark-as-read requests/replies. The first page loads as soon as the
 * event bus connects (including after a reconnect), so the bell's unread
 * count is ready without the user having to open the menu first.
 */
export function useNotifications(): UseNotificationsResult {
  const { publish, subscribe, isConnected } = useEventBus()
  const [notifications, setNotifications] = useState<NotificationDto[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  // Assumed true until the first NotificationListFetched arrives, so the
  // bell shows a spinner rather than a misleading empty state while the
  // event bus is still connecting.
  const [isLoading, setIsLoading] = useState(true)

  const fetchPage = useCallback(
    (pageToFetch: number) => {
      setIsLoading(true)
      publish(new NotificationListRequested(pageToFetch, PAGE_SIZE))
    },
    [publish],
  )

  // Fetches the first page as soon as the event bus (re)connects. Publishes
  // directly (rather than through fetchPage) so this effect only talks to
  // the external event bus and never sets state itself.
  useEffect(() => {
    if (isConnected) publish(new NotificationListRequested(1, PAGE_SIZE))
  }, [isConnected, publish])

  useEffect(() => {
    return subscribe(NotificationListFetched, (event) => {
      setNotifications((prev) => (event.page === 1 ? event.notifications : [...prev, ...event.notifications]))
      setUnreadCount(event.unreadCount)
      setTotalCount(event.totalCount)
      setPage(event.page)
      setIsLoading(false)
    })
  }, [subscribe])

  // A NotificationRequested targeting this user was just processed by the
  // notifications service: splice it straight into the list rather than
  // waiting for the next NotificationListRequested poll.
  useEffect(() => {
    return subscribe(NotificationAdded, (event) => {
      setNotifications((prev) => [event.notification, ...prev])
      setUnreadCount((prev) => prev + (event.notification.isRead ? 0 : 1))
      setTotalCount((prev) => prev + 1)
    })
  }, [subscribe])

  useEffect(() => {
    return subscribe(NotificationMarkedAsRead, (event) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === event.notificationId ? { ...n, isRead: true, readDate: new Date().toISOString() } : n)),
      )
      setUnreadCount((prev) => Math.max(prev - 1, 0))
    })
  }, [subscribe])

  useEffect(() => {
    return subscribe(AllNotificationsMarkedAsRead, () => {
      setNotifications((prev) => prev.map((n) => (n.isRead ? n : { ...n, isRead: true, readDate: new Date().toISOString() })))
      setUnreadCount(0)
    })
  }, [subscribe])

  const loadMore = useCallback(() => fetchPage(page + 1), [fetchPage, page])
  const refresh = useCallback(() => fetchPage(1), [fetchPage])
  const markAsRead = useCallback((notificationId: string) => publish(new NotificationMarkAsReadRequested(notificationId)), [publish])
  const markAllAsRead = useCallback(() => publish(new AllNotificationsMarkedAsReadRequested()), [publish])

  return {
    notifications,
    unreadCount,
    totalCount,
    isLoading,
    hasMore: notifications.length < totalCount,
    loadMore,
    refresh,
    markAsRead,
    markAllAsRead,
  }
}
