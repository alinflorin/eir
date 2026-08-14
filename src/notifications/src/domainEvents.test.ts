import { describe, expect, it } from 'vitest'
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
})
