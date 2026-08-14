import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExceptionOccurred } from '../../domain/exception-occurred.js'
import { PushSubscriptionAddRequested } from '../../domain/push-subscription-add-requested.js'
import { PushSubscriptionAdded } from '../../domain/push-subscription-added.js'
import { PushSubscriptionDeleteRequested } from '../../domain/push-subscription-delete-requested.js'
import { PushSubscriptionDeleted } from '../../domain/push-subscription-deleted.js'

const onConnect = vi.fn()
const consumeAny = vi.fn()
const publish = vi.fn()
const saveSubscription = vi.fn()
const removeSubscription = vi.fn()

vi.mock('./eventBus.js', () => ({ onConnect, consumeAny, publish }))
vi.mock('./pushSubscriptionService.js', () => ({ saveSubscription, removeSubscription }))

const { startPushSubscriptionConsumers } = await import('./pushSubscriptionConsumers.js')

// The registered handlers fire their async work without awaiting it
// (`void handleXRequested(...)`), matching eventBus's own fire-and-ack
// consume() contract. Flushing the microtask queue after invoking one lets
// tests observe the resulting publish() call.
function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

function registerAndGetHandlers() {
  onConnect.mockImplementation((listener: () => void) => listener())
  startPushSubscriptionConsumers()

  const addCall = consumeAny.mock.calls.find((call) => call[0] === PushSubscriptionAddRequested)
  const deleteCall = consumeAny.mock.calls.find((call) => call[0] === PushSubscriptionDeleteRequested)
  const rawAddHandler = addCall![2] as (request: PushSubscriptionAddRequested, user: string) => void
  const rawDeleteHandler = deleteCall![2] as (request: PushSubscriptionDeleteRequested, user: string) => void

  return {
    addHandler: async (request: PushSubscriptionAddRequested, user: string) => {
      rawAddHandler(request, user)
      await flush()
    },
    deleteHandler: async (request: PushSubscriptionDeleteRequested, user: string) => {
      rawDeleteHandler(request, user)
      await flush()
    },
  }
}

describe('pushSubscriptionConsumers', () => {
  beforeEach(() => {
    onConnect.mockReset()
    consumeAny.mockReset()
    publish.mockReset()
    saveSubscription.mockReset()
    removeSubscription.mockReset()
  })

  it('registers both consumers scoped to users, inside onConnect', () => {
    registerAndGetHandlers()

    expect(consumeAny).toHaveBeenCalledWith(PushSubscriptionAddRequested, 'users', expect.any(Function))
    expect(consumeAny).toHaveBeenCalledWith(PushSubscriptionDeleteRequested, 'users', expect.any(Function))
  })

  it('saves the subscription and publishes PushSubscriptionAdded back to the requesting user', async () => {
    const { addHandler } = registerAndGetHandlers()
    const createdAt = new Date('2026-01-01T00:00:00.000Z')
    saveSubscription.mockResolvedValue({
      endpoint: 'https://push.example.com/abc',
      expirationTime: null,
      keys: { p256dh: 'p', auth: 'a' },
      user: 'alice',
      createdAt,
    })

    const request = new PushSubscriptionAddRequested('https://push.example.com/abc', null, { p256dh: 'p', auth: 'a' })
    await addHandler(request, 'alice')

    expect(saveSubscription).toHaveBeenCalledWith('alice', {
      endpoint: request.endpoint,
      expirationTime: request.expirationTime,
      keys: request.keys,
    })
    expect(publish).toHaveBeenCalledWith(
      new PushSubscriptionAdded('https://push.example.com/abc', null, { p256dh: 'p', auth: 'a' }, createdAt.toISOString()),
      { user: 'alice' },
    )
  })

  it('publishes ExceptionOccurred to the requesting user when saving fails', async () => {
    const { addHandler } = registerAndGetHandlers()
    saveSubscription.mockRejectedValue(new Error('mongo is down'))

    const request = new PushSubscriptionAddRequested('https://push.example.com/abc', null, { p256dh: 'p', auth: 'a' })
    await addHandler(request, 'alice')

    expect(publish).toHaveBeenCalledWith(new ExceptionOccurred('mongo is down'), { user: 'alice' })
  })

  it('removes the subscription and publishes PushSubscriptionDeleted back to the requesting user', async () => {
    const { deleteHandler } = registerAndGetHandlers()
    removeSubscription.mockResolvedValue(undefined)

    const request = new PushSubscriptionDeleteRequested('https://push.example.com/abc')
    await deleteHandler(request, 'alice')

    expect(removeSubscription).toHaveBeenCalledWith(request.endpoint)
    expect(publish).toHaveBeenCalledWith(new PushSubscriptionDeleted(request.endpoint), { user: 'alice' })
  })

  it('publishes ExceptionOccurred to the requesting user when deleting fails', async () => {
    const { deleteHandler } = registerAndGetHandlers()
    removeSubscription.mockRejectedValue(new Error('mongo is down'))

    const request = new PushSubscriptionDeleteRequested('https://push.example.com/abc')
    await deleteHandler(request, 'alice')

    expect(publish).toHaveBeenCalledWith(new ExceptionOccurred('mongo is down'), { user: 'alice' })
  })
})
