import type { ComponentProps } from 'react'
import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { FluentProvider, webLightTheme, type ToastIntent } from '@fluentui/react-components'
import { ToastProvider, useToast } from './useToast'

function TestConsumer({ message, intent, title }: { message: string; intent?: ToastIntent; title?: string }) {
  const toast = useToast()

  return (
    <button onClick={() => toast(message, intent, title)}>
      Show toast
    </button>
  )
}

function renderWithProvider(props: Partial<ComponentProps<typeof TestConsumer>> = {}) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <ToastProvider>
        <TestConsumer message="Saved" {...props} />
      </ToastProvider>
    </FluentProvider>,
  )
}

describe('useToast', () => {
  it('renders no toast until toast is called', async () => {
    const screen = await renderWithProvider()

    await expect.element(screen.getByText('Saved')).not.toBeInTheDocument()
  })

  it('dispatches a toast with the given message', async () => {
    const screen = await renderWithProvider({ message: 'Saved successfully' })

    await screen.getByRole('button', { name: 'Show toast' }).click()

    await expect.element(screen.getByText('Saved successfully')).toBeVisible()
  })

  it('renders the title when provided', async () => {
    const screen = await renderWithProvider({ message: 'Your changes were saved.', title: 'Saved' })

    await screen.getByRole('button', { name: 'Show toast' }).click()

    await expect.element(screen.getByText('Saved')).toBeVisible()
    await expect.element(screen.getByText('Your changes were saved.')).toBeVisible()
  })

  it('renders a close button on the toast', async () => {
    const screen = await renderWithProvider({ message: 'Saved' })

    await screen.getByRole('button', { name: 'Show toast' }).click()

    await expect.element(screen.getByRole('button', { name: 'Close' })).toBeVisible()
  })

  it('dismisses the toast when the close button is clicked', async () => {
    const screen = await renderWithProvider({ message: 'Saved' })

    await screen.getByRole('button', { name: 'Show toast' }).click()
    await expect.element(screen.getByText('Saved')).toBeVisible()

    await screen.getByRole('button', { name: 'Close' }).click()

    await expect.element(screen.getByText('Saved')).not.toBeInTheDocument()
  })

  it('throws when used outside a ToastProvider', async () => {
    function Unwrapped() {
      useToast()
      return null
    }

    await expect(async () => {
      await render(
        <FluentProvider theme={webLightTheme}>
          <Unwrapped />
        </FluentProvider>,
      )
    }).rejects.toThrow('useToast must be used within a ToastProvider')
  })
})
