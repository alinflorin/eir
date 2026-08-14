import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import { useState } from 'react'
import { ConfirmProvider, useConfirm, type ConfirmOptions } from './useConfirm'

function TestConsumer(props: Partial<ConfirmOptions> = {}) {
  const confirm = useConfirm()
  const [result, setResult] = useState<string>('none')

  return (
    <>
      <button
        onClick={async () => {
          const confirmed = await confirm({ message: 'Are you sure?', ...props })
          setResult(confirmed ? 'confirmed' : 'cancelled')
        }}
      >
        Ask
      </button>
      <span>Result: {result}</span>
    </>
  )
}

function renderWithProvider(props: Partial<ConfirmOptions> = {}) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <ConfirmProvider>
        <TestConsumer {...props} />
      </ConfirmProvider>
    </FluentProvider>,
  )
}

describe('useConfirm', () => {
  it('renders no dialog until confirm is called', async () => {
    const screen = await renderWithProvider()

    await expect.element(screen.getByText('Are you sure?')).not.toBeInTheDocument()
  })

  it('shows the message with default title and button text', async () => {
    const screen = await renderWithProvider()

    await screen.getByRole('button', { name: 'Ask' }).click()

    await expect.element(screen.getByText('Are you sure?')).toBeVisible()
    await expect.element(screen.getByText('Please confirm')).toBeVisible()
    await expect.element(screen.getByRole('button', { name: 'Confirm' })).toBeVisible()
    await expect.element(screen.getByRole('button', { name: 'Cancel' })).toBeVisible()
  })

  it('uses custom title and button text when provided', async () => {
    const screen = await renderWithProvider({
      title: 'Delete item',
      confirmText: 'Delete',
      cancelText: 'Keep it',
    })

    await screen.getByRole('button', { name: 'Ask' }).click()

    await expect.element(screen.getByText('Delete item')).toBeVisible()
    await expect.element(screen.getByRole('button', { name: 'Delete' })).toBeVisible()
    await expect.element(screen.getByRole('button', { name: 'Keep it' })).toBeVisible()
  })

  it('resolves true and closes the dialog when confirmed', async () => {
    const screen = await renderWithProvider()

    await screen.getByRole('button', { name: 'Ask' }).click()
    await screen.getByRole('button', { name: 'Confirm' }).click()

    await expect.element(screen.getByText('Result: confirmed')).toBeVisible()
    await expect.element(screen.getByText('Are you sure?')).not.toBeInTheDocument()
  })

  it('resolves false and closes the dialog when cancelled', async () => {
    const screen = await renderWithProvider()

    await screen.getByRole('button', { name: 'Ask' }).click()
    await screen.getByRole('button', { name: 'Cancel' }).click()

    await expect.element(screen.getByText('Result: cancelled')).toBeVisible()
    await expect.element(screen.getByText('Are you sure?')).not.toBeInTheDocument()
  })

  it('throws when used outside a ConfirmProvider', async () => {
    function Unwrapped() {
      useConfirm()
      return null
    }

    await expect(async () => {
      await render(
        <FluentProvider theme={webLightTheme}>
          <Unwrapped />
        </FluentProvider>,
      )
    }).rejects.toThrow('useConfirm must be used within a ConfirmProvider')
  })
})
