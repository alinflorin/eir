import { describe, expect, it } from 'vitest'
import { AllNotificationsMarkedAsRead } from '../../domain/all-notifications-marked-as-read.js'
import { AllNotificationsMarkedAsReadRequested } from '../../domain/all-notifications-marked-as-read-requested.js'
import { NotificationListFetched } from '../../domain/notification-list-fetched.js'
import { NotificationListRequested } from '../../domain/notification-list-requested.js'
import { NotificationMarkAsReadRequested } from '../../domain/notification-mark-as-read-requested.js'
import { NotificationMarkedAsRead } from '../../domain/notification-marked-as-read.js'
import { NotificationProcessed } from '../../domain/notification-processed.js'
import { NotificationRequested } from '../../domain/notification-requested.js'
import { PushSubscriptionAddRequested } from '../../domain/push-subscription-add-requested.js'
import { PushSubscriptionAdded } from '../../domain/push-subscription-added.js'
import { PushSubscriptionDeleteRequested } from '../../domain/push-subscription-delete-requested.js'
import { PushSubscriptionDeleted } from '../../domain/push-subscription-deleted.js'

// Smoke tests for the plain-data event classes: eventBus routes/reconstructs
// these by class name and field shape, so constructors assigning fields
// correctly matters even without any other logic to exercise.
describe('domain events', () => {
  it('NotificationRequested assigns all fields, defaulting link to undefined', () => {
    const event = new NotificationRequested('alice@example.com', 'Hi', 'body', ['push', 'email'])

    expect(event).toMatchObject({
      userName: 'alice@example.com',
      title: 'Hi',
      body: 'body',
      notificationTypes: ['push', 'email'],
      link: undefined,
    })
  })

  it('NotificationRequested keeps an optional link when given', () => {
    const event = new NotificationRequested('alice@example.com', 'Hi', 'body', ['push'], 'https://eir.localhost')

    expect(event.link).toBe('https://eir.localhost')
  })

  it('NotificationProcessed assigns userName, title and results', () => {
    const results = [{ type: 'push' as const, success: true }]
    const event = new NotificationProcessed('alice@example.com', 'Hi', results)

    expect(event).toMatchObject({ userName: 'alice@example.com', title: 'Hi', results })
  })

  it('PushSubscriptionAddRequested assigns endpoint, expirationTime and keys', () => {
    const keys = { p256dh: 'p', auth: 'a' }
    const event = new PushSubscriptionAddRequested('https://push.example.com/a', null, keys)

    expect(event).toMatchObject({ endpoint: 'https://push.example.com/a', expirationTime: null, keys })
  })

  it('PushSubscriptionAdded assigns endpoint, expirationTime, keys and createdAt', () => {
    const keys = { p256dh: 'p', auth: 'a' }
    const event = new PushSubscriptionAdded('https://push.example.com/a', null, keys, '2026-01-01T00:00:00.000Z')

    expect(event).toMatchObject({
      endpoint: 'https://push.example.com/a',
      expirationTime: null,
      keys,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it('PushSubscriptionDeleteRequested assigns endpoint', () => {
    expect(new PushSubscriptionDeleteRequested('https://push.example.com/a').endpoint).toBe('https://push.example.com/a')
  })

  it('PushSubscriptionDeleted assigns endpoint', () => {
    expect(new PushSubscriptionDeleted('https://push.example.com/a').endpoint).toBe('https://push.example.com/a')
  })

  it('NotificationListRequested assigns page and pageSize', () => {
    const event = new NotificationListRequested(2, 20)

    expect(event).toMatchObject({ page: 2, pageSize: 20 })
  })

  it('NotificationListFetched assigns notifications, page, pageSize, totalCount and unreadCount', () => {
    const notifications = [{ id: 'abc', title: 'Hi', body: 'body', date: '2026-01-01T00:00:00.000Z', isRead: false }]
    const event = new NotificationListFetched(notifications, 1, 20, 5, 2)

    expect(event).toMatchObject({ notifications, page: 1, pageSize: 20, totalCount: 5, unreadCount: 2 })
  })

  it('NotificationMarkAsReadRequested assigns notificationId', () => {
    expect(new NotificationMarkAsReadRequested('abc123').notificationId).toBe('abc123')
  })

  it('NotificationMarkedAsRead assigns notificationId', () => {
    expect(new NotificationMarkedAsRead('abc123').notificationId).toBe('abc123')
  })

  it('AllNotificationsMarkedAsReadRequested and AllNotificationsMarkedAsRead carry no fields', () => {
    expect(new AllNotificationsMarkedAsReadRequested()).toMatchObject({})
    expect(new AllNotificationsMarkedAsRead()).toMatchObject({})
  })
})
