import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { useEventBus } from '../hooks/useEventBus'
import { CreateInvoiceRequested } from '../../../domain/create-invoice-requested'
import Settings from './Settings'

vi.mock('../hooks/useEventBus', () => ({
  useEventBus: vi.fn(),
}))

describe('Settings', () => {
  it('publishes a CreateInvoiceRequested event on button click', async () => {
    const publish = vi.fn()
    const subscribe = vi.fn().mockReturnValue(() => {})
    vi.mocked(useEventBus).mockReturnValue({
      connect: vi.fn(),
      disconnect: vi.fn(),
      publish,
      subscribe,
    })

    const screen = await render(<Settings />)

    await expect.element(screen.getByText('Settings')).toBeVisible()

    await screen.getByRole('button').click()

    expect(publish).toHaveBeenCalledOnce()
    expect(publish.mock.calls[0][0]).toBeInstanceOf(CreateInvoiceRequested)
    expect(publish.mock.calls[0][0]).toMatchObject({ id: 'test' })
  })

  it('subscribes to InvoiceCreated on mount and unsubscribes on unmount', async () => {
    const unsubscribe = vi.fn()
    const subscribe = vi.fn().mockReturnValue(unsubscribe)
    vi.mocked(useEventBus).mockReturnValue({
      connect: vi.fn(),
      disconnect: vi.fn(),
      publish: vi.fn(),
      subscribe,
    })

    const screen = await render(<Settings />)

    expect(subscribe).toHaveBeenCalledOnce()

    await screen.unmount()

    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})
