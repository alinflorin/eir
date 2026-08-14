import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PushSubscriptionAddRequested } from '../../../domain/push-subscription-add-requested'
import { PushSubscriptionAdded } from '../../../domain/push-subscription-added'
import { PushSubscriptionDeleteRequested } from '../../../domain/push-subscription-delete-requested'
import { PushSubscriptionDeleted } from '../../../domain/push-subscription-deleted'
import { useEventBus } from './useEventBus'
import { useToast } from './useToast'

const VAPID_PUBLIC_KEY: string | undefined = import.meta.env.VITE_VAPID_PUBLIC_KEY

// A push subscription's applicationServerKey must be a Uint8Array, but the
// VAPID public key is handed out as a URL-safe base64 string.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i)
  }
  return bytes
}

export type PushNotificationState =
  | 'unsupported'
  | 'default'
  | 'denied'
  | 'enabling'
  | 'enabled'
  | 'disabling'

// Checked fresh (not cached at module scope) so it reflects the actual
// globals at call time — both for correctness across browsers that patch
// these in late, and so tests can stub them per case.
function checkSupport(): boolean {
  return typeof Notification !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

/**
 * Manages this device's push subscription: browser permission plus the
 * server-side record of it, kept in sync entirely over the event bus (no
 * REST) via PushSubscriptionAddRequested/DeleteRequested and their
 * PushSubscriptionAdded/Deleted replies. ExceptionOccurred failures surface
 * through GlobalErrorHandler, same as any other event-bus request.
 */
export function usePushNotifications() {
  const { t } = useTranslation()
  const toast = useToast()
  const { publish, subscribe } = useEventBus()
  const [state, setState] = useState<PushNotificationState>(() => {
    if (!checkSupport()) return 'unsupported'
    return Notification.permission === 'denied' ? 'denied' : 'default'
  })

  // Reflect this device's actual subscription state on mount, in case it was
  // enabled in a previous session (or revoked via the browser's own UI).
  useEffect(() => {
    if (!checkSupport()) return
    let cancelled = false
    void navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (cancelled) return
        if (subscription) {
          setState('enabled')
        } else {
          setState(Notification.permission === 'denied' ? 'denied' : 'default')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return subscribe(PushSubscriptionAdded, () => {
      setState('enabled')
      toast(t('pages.settings.notifications.enabledToast'), 'success')
    })
  }, [subscribe, toast, t])

  useEffect(() => {
    return subscribe(PushSubscriptionDeleted, () => {
      setState('default')
      toast(t('pages.settings.notifications.disabledToast'), 'success')
    })
  }, [subscribe, toast, t])

  const enable = useCallback(async () => {
    if (!checkSupport() || !VAPID_PUBLIC_KEY) return
    setState('enabling')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'default')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      const json = subscription.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        throw new Error('browser returned an incomplete push subscription')
      }

      publish(
        new PushSubscriptionAddRequested(json.endpoint, json.expirationTime ?? null, {
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        }),
      )
      // state resolves to 'enabled' once the PushSubscriptionAdded reply arrives.
    } catch (err) {
      console.error('failed to enable push notifications', err)
      setState(Notification.permission === 'denied' ? 'denied' : 'default')
    }
  }, [publish])

  const disable = useCallback(async () => {
    if (!checkSupport()) return
    setState('disabling')
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        setState('default')
        return
      }
      const { endpoint } = subscription
      await subscription.unsubscribe()
      publish(new PushSubscriptionDeleteRequested(endpoint))
      // state resolves to 'default' once the PushSubscriptionDeleted reply arrives.
    } catch (err) {
      console.error('failed to disable push notifications', err)
      setState('enabled')
    }
  }, [publish])

  return { state, enable, disable }
}
