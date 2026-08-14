import { ExceptionOccurred } from '../../domain/exception-occurred.js'
import { PushSubscriptionAdded } from '../../domain/push-subscription-added.js'
import { PushSubscriptionDeleteRequested } from '../../domain/push-subscription-delete-requested.js'
import { PushSubscriptionDeleted } from '../../domain/push-subscription-deleted.js'
import { PushSubscriptionAddRequested } from '../../domain/push-subscription-add-requested.js'
import { consumeAny, onConnect, publish } from './eventBus.js'
import { removeSubscription, saveSubscription } from './pushSubscriptionService.js'

/**
 * Registers this service's push-subscription consumers. Both events come
 * from users (managing their own subscriptions from the browser), not
 * services, so they're bound with consumeAny(..., 'users', ...).
 *
 * Registration happens inside onConnect since the underlying queue
 * bindings live on the rabbitmq channel, which is replaced on every
 * reconnect.
 */
export function startPushSubscriptionConsumers(): void {
  onConnect(() => {
    void consumeAny(PushSubscriptionAddRequested, 'users', (request, user) => {
      void handleAddRequested(request, user)
    })

    void consumeAny(PushSubscriptionDeleteRequested, 'users', (request, user) => {
      void handleDeleteRequested(request, user)
    })
  })
}

async function handleAddRequested(request: PushSubscriptionAddRequested, user: string): Promise<void> {
  try {
    const doc = await saveSubscription(user, {
      endpoint: request.endpoint,
      expirationTime: request.expirationTime,
      keys: request.keys,
    })
    publish(new PushSubscriptionAdded(doc.endpoint, doc.expirationTime, doc.keys, doc.createdAt.toISOString()), { user })
  } catch (err) {
    reportException('failed to save push subscription', err, user)
  }
}

async function handleDeleteRequested(request: PushSubscriptionDeleteRequested, user: string): Promise<void> {
  try {
    await removeSubscription(request.endpoint)
    publish(new PushSubscriptionDeleted(request.endpoint), { user })
  } catch (err) {
    reportException('failed to delete push subscription', err, user)
  }
}

function reportException(context: string, err: unknown, user: string): void {
  console.error(context, err)
  publish(new ExceptionOccurred(err instanceof Error ? err.message : String(err)), { user })
}
