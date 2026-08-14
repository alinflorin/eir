import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import { ToastProvider } from './useToast'
import { ConfirmProvider } from './useConfirm'
import { useServiceWorkerUpdate } from './useServiceWorkerUpdate'
import {
  __reset,
  __setNeedRefresh,
  __setOfflineReady,
  __triggerOnRegisteredSW,
  __triggerOnRegisterError,
  updateServiceWorkerMock,
} from '../test-mocks/pwaRegisterReactControllable'

// Redirects the real 'virtual:pwa-register/react' resolution (aliased in
// vitest.config.ts to a static stub) to a controllable mock so these tests
// can drive needRefresh/offlineReady transitions.
vi.mock('virtual:pwa-register/react', () => import('../test-mocks/pwaRegisterReactControllable'))

function Harness() {
  useServiceWorkerUpdate()
  return null
}

function renderHarness() {
  return render(
    <FluentProvider theme={webLightTheme}>
      <ToastProvider>
        <ConfirmProvider>
          <Harness />
        </ConfirmProvider>
      </ToastProvider>
    </FluentProvider>,
  )
}

describe('useServiceWorkerUpdate', () => {
  afterEach(() => {
    __reset()
  })

  it('prompts to reload when an update becomes available', async () => {
    const screen = await renderHarness()

    __setNeedRefresh(true)

    await expect.element(screen.getByText('Update available')).toBeVisible()
    await expect
      .element(screen.getByText('A new version of the app is ready. Reload now to update?'))
      .toBeVisible()
    await expect.element(screen.getByRole('button', { name: 'Reload' })).toBeVisible()
    await expect.element(screen.getByRole('button', { name: 'Later' })).toBeVisible()
  })

  it('reloads the service worker when the user confirms', async () => {
    const screen = await renderHarness()

    __setNeedRefresh(true)
    await screen.getByRole('button', { name: 'Reload' }).click()

    expect(updateServiceWorkerMock).toHaveBeenCalledWith(true)
  })

  it('dismisses without updating when the user declines', async () => {
    const screen = await renderHarness()

    __setNeedRefresh(true)
    await screen.getByRole('button', { name: 'Later' }).click()

    await expect.element(screen.getByText('Update available')).not.toBeInTheDocument()
    expect(updateServiceWorkerMock).not.toHaveBeenCalled()
  })

  it('shows a toast once the app is ready to work offline', async () => {
    const screen = await renderHarness()

    __setOfflineReady(true)

    await expect.element(screen.getByText('Ready for offline use')).toBeVisible()
    await expect
      .element(screen.getByText('The app has been installed and will now work offline.'))
      .toBeVisible()
  })

  it('polls the registration for updates on an interval', async () => {
    vi.useFakeTimers()
    try {
      await renderHarness()
      const update = vi.fn()

      __triggerOnRegisteredSW({ update })
      expect(update).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
      expect(update).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
      expect(update).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('logs a registration error instead of throwing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await renderHarness()

    __triggerOnRegisterError(new Error('registration failed'))

    expect(errorSpy).toHaveBeenCalledWith('Service worker registration failed', expect.any(Error))
    errorSpy.mockRestore()
  })
})
