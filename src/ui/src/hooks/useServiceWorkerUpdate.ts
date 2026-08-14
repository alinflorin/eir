import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useConfirm } from './useConfirm'
import { useToast } from './useToast'

const CHECK_INTERVAL_MS = 60 * 60 * 1000 // hourly

/**
 * Registers the app's service worker and drives the "OTA update" UX:
 *  - when a new version has finished downloading in the background, asks the
 *    user (via useConfirm) whether to reload now to activate it;
 *  - when the app has been precached and is ready to work offline for the
 *    first time, lets the user know via a toast.
 *
 * Call once near the app root, inside both ToastProvider and ConfirmProvider.
 */
export function useServiceWorkerUpdate() {
  const { t } = useTranslation()
  const confirm = useConfirm()
  const toast = useToast()
  const promptInFlight = useRef(false)

  const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // registerType: 'prompt' means Workbox never auto-checks for updates,
      // so poll periodically for a new service worker while the app is open.
      window.setInterval(() => void registration.update(), CHECK_INTERVAL_MS)
    },
    onRegisterError(error) {
      console.error('Service worker registration failed', error)
    },
  })

  const [needRefreshValue, setNeedRefresh] = needRefresh
  const [offlineReadyValue, setOfflineReady] = offlineReady

  useEffect(() => {
    if (!needRefreshValue || promptInFlight.current) return

    promptInFlight.current = true
    void confirm({
      title: t('pwa.updateAvailable.title'),
      message: t('pwa.updateAvailable.body'),
      confirmText: t('pwa.updateAvailable.confirmButton'),
      cancelText: t('pwa.updateAvailable.cancelButton'),
    }).then((confirmed) => {
      promptInFlight.current = false
      if (confirmed) {
        void updateServiceWorker(true)
      } else {
        // Let the user dismiss and keep working; they'll be asked again on
        // the next periodic check (or next reload) as long as the update
        // is still pending.
        setNeedRefresh(false)
      }
    })
  }, [needRefreshValue, confirm, updateServiceWorker, setNeedRefresh, t])

  useEffect(() => {
    if (!offlineReadyValue) return

    toast(t('pwa.offlineReady.body'), 'success', t('pwa.offlineReady.title'))
    setOfflineReady(false)
  }, [offlineReadyValue, toast, setOfflineReady, t])
}
