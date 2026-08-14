import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExceptionOccurred } from '../../domain/exception-occurred.js'
import { NotificationProcessed } from '../../domain/notification-processed.js'
import { NotificationRequested } from '../../domain/notification-requested.js'

const onConnect = vi.fn()
const consumeAny = vi.fn()
const publish = vi.fn()
const sendMail = vi.fn()
const sendPushNotification = vi.fn()

vi.mock('./eventBus.js', () => ({ onConnect, consumeAny, publish }))
vi.mock('./mailer.js', () => ({ sendMail }))
vi.mock('./pushNotificationService.js', () => ({ sendPushNotification }))

const { startNotificationConsumers } = await import('./notificationConsumers.js')

function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

async function invoke(request: NotificationRequested, callerService: string): Promise<void> {
  onConnect.mockImplementation((listener: () => void) => listener())
  startNotificationConsumers()
  const call = consumeAny.mock.calls.find((c) => c[0] === NotificationRequested)
  const handler = call![2] as (request: NotificationRequested, callerService: string) => void
  handler(request, callerService)
  await flush()
}

describe('notificationConsumers', () => {
  beforeEach(() => {
    onConnect.mockReset()
    consumeAny.mockReset()
    publish.mockReset()
    sendMail.mockReset().mockResolvedValue(undefined)
    sendPushNotification.mockReset().mockResolvedValue(undefined)
  })

  it('registers the NotificationRequested consumer scoped to services', () => {
    onConnect.mockImplementation((listener: () => void) => listener())
    startNotificationConsumers()

    expect(consumeAny).toHaveBeenCalledWith(NotificationRequested, 'services', expect.any(Function))
  })

  it('delivers push and email, then publishes NotificationProcessed with both results back to the caller', async () => {
    const request = new NotificationRequested('alice@example.com', 'Hi', 'body', ['push', 'email'], 'https://eir.localhost')

    await invoke(request, 'billing')

    expect(sendPushNotification).toHaveBeenCalledWith('alice@example.com', 'Hi', 'body', 'https://eir.localhost')
    expect(sendMail).toHaveBeenCalledWith(
      'alice@example.com',
      'Hi',
      '<p>body</p><p><a href="https://eir.localhost">https://eir.localhost</a></p>',
    )
    expect(publish).toHaveBeenCalledWith(
      new NotificationProcessed('alice@example.com', 'Hi', [
        { type: 'push', success: true },
        { type: 'email', success: true },
      ]),
      { service: 'billing' },
    )
  })

  it('omits the link paragraph and passes no text fallback when no link is given', async () => {
    const request = new NotificationRequested('alice@example.com', 'Hi', 'body', ['email'])

    await invoke(request, 'billing')

    expect(sendMail).toHaveBeenCalledWith('alice@example.com', 'Hi', '<p>body</p>')
  })

  it('escapes html-significant characters in body and link', async () => {
    const request = new NotificationRequested('alice@example.com', 'Hi', '<b>bold</b> & "quoted"', ['email'], 'https://a.com?x=1&y=2')

    await invoke(request, 'billing')

    expect(sendMail).toHaveBeenCalledWith(
      'alice@example.com',
      'Hi',
      '<p>&lt;b&gt;bold&lt;/b&gt; &amp; &quot;quoted&quot;</p>' +
        '<p><a href="https://a.com?x=1&amp;y=2">https://a.com?x=1&amp;y=2</a></p>',
    )
  })

  it('records a per-channel failure without failing the other channel or the whole batch', async () => {
    sendPushNotification.mockRejectedValue(new Error('no subscriptions'))
    const request = new NotificationRequested('alice@example.com', 'Hi', 'body', ['push', 'email'])

    await invoke(request, 'billing')

    expect(publish).toHaveBeenCalledWith(
      new NotificationProcessed('alice@example.com', 'Hi', [
        { type: 'push', success: false, error: 'no subscriptions' },
        { type: 'email', success: true },
      ]),
      { service: 'billing' },
    )
  })

  it('publishes ExceptionOccurred to the caller if processing the request itself throws', async () => {
    publish.mockImplementationOnce(() => {
      throw new Error('rabbitmq unavailable')
    })
    const request = new NotificationRequested('alice@example.com', 'Hi', 'body', ['email'])

    await invoke(request, 'billing')

    expect(publish).toHaveBeenLastCalledWith(new ExceptionOccurred('rabbitmq unavailable'), { service: 'billing' })
  })
})
