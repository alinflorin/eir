import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import NotificationBell from './NotificationBell'
import { useNotifications, type UseNotificationsResult } from '../hooks/useNotifications'

vi.mock('../hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
}))

const notificationA = { id: 'a', title: 'Server down', body: 'Something broke', date: '2026-01-01T00:00:00.000Z', isRead: false }
const notificationB = {
  id: 'b',
  title: 'Welcome',
  body: 'Thanks for joining',
  date: '2026-01-02T00:00:00.000Z',
  isRead: true,
  readDate: '2026-01-02T01:00:00.000Z',
}

function mockNotifications(overrides: Partial<UseNotificationsResult> = {}) {
  const value: UseNotificationsResult = {
    notifications: [],
    unreadCount: 0,
    totalCount: 0,
    isLoading: false,
    hasMore: false,
    loadMore: vi.fn(),
    refresh: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    ...overrides,
  }
  vi.mocked(useNotifications).mockReturnValue(value)
  return value
}

async function renderBell() {
  return render(
    <FluentProvider theme={webLightTheme}>
      <NotificationBell />
    </FluentProvider>,
  )
}

describe('NotificationBell', () => {
  it('shows no badge when there are no unread notifications', async () => {
    mockNotifications({ unreadCount: 0 })

    const screen = await renderBell()

    await expect.element(screen.getByText('0')).not.toBeInTheDocument()
  })

  it('shows the unread count as a badge on the bell', async () => {
    mockNotifications({ unreadCount: 3 })

    const screen = await renderBell()

    await expect.element(screen.getByText('3')).toBeVisible()
  })

  it('opens to an empty state when there are no notifications', async () => {
    mockNotifications({ notifications: [] })

    const screen = await renderBell()
    await screen.getByRole('button').click()

    await expect.element(screen.getByText('You have no notifications yet.')).toBeVisible()
  })

  it('lists notifications with title and body', async () => {
    mockNotifications({ notifications: [notificationA, notificationB], unreadCount: 1, totalCount: 2 })

    const screen = await renderBell()
    await screen.getByRole('button').click()

    await expect.element(screen.getByText('Server down')).toBeVisible()
    await expect.element(screen.getByText('Something broke')).toBeVisible()
    await expect.element(screen.getByText('Welcome')).toBeVisible()
  })

  it('marks an unread notification as read when clicked', async () => {
    const { markAsRead } = mockNotifications({ notifications: [notificationA], unreadCount: 1, totalCount: 1 })

    const screen = await renderBell()
    await screen.getByRole('button').click()
    await screen.getByText('Server down').click()

    expect(markAsRead).toHaveBeenCalledWith('a')
  })

  it('does not re-mark an already-read notification as read when clicked', async () => {
    const { markAsRead } = mockNotifications({ notifications: [notificationB], unreadCount: 0, totalCount: 1 })

    const screen = await renderBell()
    await screen.getByRole('button').click()
    await screen.getByText('Welcome').click()

    expect(markAsRead).not.toHaveBeenCalled()
  })

  it('offers to mark all as read only when there are unread notifications', async () => {
    mockNotifications({ notifications: [notificationA], unreadCount: 1, totalCount: 1 })

    const screen = await renderBell()
    await screen.getByRole('button').click()

    await expect.element(screen.getByText('Mark all as read')).toBeVisible()
  })

  it('marks all as read when the link is clicked', async () => {
    const { markAllAsRead } = mockNotifications({ notifications: [notificationA], unreadCount: 1, totalCount: 1 })

    const screen = await renderBell()
    await screen.getByRole('button').click()
    await screen.getByText('Mark all as read').click()

    expect(markAllAsRead).toHaveBeenCalledOnce()
  })

  it('offers to load more when there are more notifications to fetch', async () => {
    const { loadMore } = mockNotifications({ notifications: [notificationA], unreadCount: 1, totalCount: 5, hasMore: true })

    const screen = await renderBell()
    await screen.getByRole('button').click()
    await screen.getByText('Load more').click()

    expect(loadMore).toHaveBeenCalledOnce()
  })

  it('shows a spinner instead of load more while a page is loading', async () => {
    mockNotifications({ notifications: [notificationA], unreadCount: 1, totalCount: 5, hasMore: true, isLoading: true })

    const screen = await renderBell()
    await screen.getByRole('button').click()

    await expect.element(screen.getByRole('progressbar')).toBeVisible()
    await expect.element(screen.getByText('Load more')).not.toBeInTheDocument()
  })
})
