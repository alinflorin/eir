import { ExceptionOccurred } from '../../domain/exception-occurred.js'
import { NotificationProcessed, type NotificationResult } from '../../domain/notification-processed.js'
import { NotificationRequested, type NotificationType } from '../../domain/notification-requested.js'
import { consumeAny, onConnect, publish } from './eventBus.js'
import { sendMail } from './mailer.js'
import { saveNotification } from './notificationService.js'
import { sendPushNotification } from './pushNotificationService.js'

/**
 * Registers the NotificationRequested consumer. Requests come from other
 * services asking this one to notify a user, so it's bound with
 * consumeAny(..., 'services', ...) and the reply goes back to that same
 * service's namespace.
 *
 * Registration happens inside onConnect since the underlying queue
 * bindings live on the rabbitmq channel, which is replaced on every
 * reconnect.
 */
export function startNotificationConsumers(): void {
  onConnect(() => {
    void consumeAny(NotificationRequested, 'services', (request, callerService) => {
      void handleNotificationRequested(request, callerService)
    })
  })
}

async function handleNotificationRequested(request: NotificationRequested, callerService: string): Promise<void> {
  try {
    await saveNotification(request.userName, request.title, request.body, request.link)
    const results = await Promise.all(request.notificationTypes.map((type) => deliver(type, request)))
    publish(new NotificationProcessed(request.userName, request.title, results), { service: callerService })
  } catch (err) {
    console.error('failed to process notification request', err)
    publish(new ExceptionOccurred(err instanceof Error ? err.message : String(err)), { service: callerService })
  }
}

async function deliver(type: NotificationType, request: NotificationRequested): Promise<NotificationResult> {
  try {
    if (type === 'push') {
      await sendPushNotification(request.userName, request.title, request.body, request.link)
    } else {
      await sendMail(request.userName, request.title, renderHtml(request.body, request.link))
    }
    return { type, success: true }
  } catch (err) {
    return { type, success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function renderHtml(body: string, link?: string): string {
  const paragraph = `<p>${escapeHtml(body)}</p>`
  const anchor = link ? `<p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>` : ''
  return paragraph + anchor
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
