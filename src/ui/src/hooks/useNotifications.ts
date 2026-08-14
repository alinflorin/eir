import { useCallback, useEffect, useState } from 'react'
import { AllNotificationsMarkedAsRead } from '../../../domain/all-notifications-marked-as-read'
import { AllNotificationsMarkedAsReadRequested } from '../../../domain/all-notifications-marked-as-read-requested'
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
  const [isLoading, setIsLoading] = useState(false)

  const fetchPage = useCallback(
    (pageToFetch: number) => {
      setIsLoading(true)
      publish(new NotificationListRequested(pageToFetch, PAGE_SIZE))
    },
    [publish],
  )

  useEffect(() => {
    if (isConnected) fetchPage(1)
  }, [isConnected, fetchPage])

  useEffect(() => {
    return subscribe(NotificationListFetched, (event) => {
      setNotifications((prev) => (event.page === 1 ? event.notifications : [...prev, ...event.notifications]))
      setUnreadCount(event.unreadCount)
      setTotalCount(event.totalCount)
      setPage(event.page)
      setIsLoading(false)
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
