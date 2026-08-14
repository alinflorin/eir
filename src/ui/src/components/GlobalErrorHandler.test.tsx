import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import { useEventBus } from '../hooks/useEventBus'
import { ToastProvider } from '../hooks/useToast'
import { ExceptionOccurred } from '../../../domain/exception-occurred'
import GlobalErrorHandler from './GlobalErrorHandler'

vi.mock('../hooks/useEventBus', () => ({
  useEventBus: vi.fn(),
}))

function mockSubscribe() {
  const unsubscribe = vi.fn()
  const subscribe = vi.fn().mockReturnValue(unsubscribe)
  vi.mocked(useEventBus).mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    publish: vi.fn(),
    subscribe,
    isConnected: true,
  })
  return { subscribe, unsubscribe }
}

function renderHandler() {
  return render(
    <FluentProvider theme={webLightTheme}>
      <ToastProvider>
        <GlobalErrorHandler />
      </ToastProvider>
    </FluentProvider>,
  )
}

describe('GlobalErrorHandler', () => {
  it('subscribes to ExceptionOccurred on mount and unsubscribes on unmount', async () => {
    const { subscribe, unsubscribe } = mockSubscribe()

    const screen = await renderHandler()

    expect(subscribe).toHaveBeenCalledOnce()
    expect(subscribe.mock.calls[0][0]).toBe(ExceptionOccurred)

    await screen.unmount()

    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('shows a toast with the translated message when an exception occurs', async () => {
    const { subscribe } = mockSubscribe()
    const screen = await renderHandler()
    const onMessage = subscribe.mock.calls[0][1]

    onMessage(new ExceptionOccurred('nav.home'))

    await expect.element(screen.getByText('Home')).toBeVisible()
  })

  it('shows a toast with the translated title when an exception has one', async () => {
    const { subscribe } = mockSubscribe()
    const screen = await renderHandler()
    const onMessage = subscribe.mock.calls[0][1]

    onMessage(new ExceptionOccurred('nav.home', 'nav.contact'))

    await expect.element(screen.getByText('Contact')).toBeVisible()
    await expect.element(screen.getByText('Home')).toBeVisible()
  })
})
