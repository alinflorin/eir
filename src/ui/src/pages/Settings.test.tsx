import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { usePushNotifications, type PushNotificationState } from '../hooks/usePushNotifications'
import Settings from './Settings'

vi.mock('../hooks/usePushNotifications', () => ({
  usePushNotifications: vi.fn(),
}))

function mockPushNotifications(state: PushNotificationState) {
  const enable = vi.fn().mockResolvedValue(undefined)
  const disable = vi.fn().mockResolvedValue(undefined)
  vi.mocked(usePushNotifications).mockReturnValue({ state, enable, disable })
  return { enable, disable }
}

describe('Settings', () => {
  it('renders the settings page', async () => {
    mockPushNotifications('default')
    const screen = await render(<Settings />)

    await expect.element(screen.getByText('Settings')).toBeVisible()
  })

  it('shows the notification toggle unchecked and enabled when permission has not been decided', async () => {
    mockPushNotifications('default')
    const screen = await render(<Settings />)

    const toggle = screen.getByRole('switch', { name: 'Push notifications on this device' })
    await expect.element(toggle).toBeVisible()
    await expect.element(toggle).not.toBeChecked()
    await expect.element(toggle).toBeEnabled()
  })

  it('shows the toggle checked when notifications are enabled', async () => {
    mockPushNotifications('enabled')
    const screen = await render(<Settings />)

    await expect.element(screen.getByRole('switch', { name: 'Push notifications on this device' })).toBeChecked()
  })

  it('calls enable() when the user turns the toggle on', async () => {
    const { enable } = mockPushNotifications('default')
    const screen = await render(<Settings />)

    await screen.getByRole('switch', { name: 'Push notifications on this device' }).click()

    expect(enable).toHaveBeenCalledOnce()
  })

  it('calls disable() when the user turns the toggle off', async () => {
    const { disable } = mockPushNotifications('enabled')
    const screen = await render(<Settings />)

    await screen.getByRole('switch', { name: 'Push notifications on this device' }).click()

    expect(disable).toHaveBeenCalledOnce()
  })

  it('disables the toggle and shows a spinner while enabling/disabling', async () => {
    mockPushNotifications('enabling')
    const screen = await render(<Settings />)

    await expect.element(screen.getByRole('switch', { name: 'Push notifications on this device' })).toBeDisabled()
    await expect.element(screen.getByRole('progressbar')).toBeVisible()
  })

  it('disables the toggle and explains when the browser is unsupported', async () => {
    mockPushNotifications('unsupported')
    const screen = await render(<Settings />)

    await expect.element(screen.getByRole('switch', { name: 'Push notifications on this device' })).toBeDisabled()
    await expect.element(screen.getByText("Your browser doesn't support push notifications.")).toBeVisible()
  })

  it('disables the toggle and explains when permission was denied', async () => {
    mockPushNotifications('denied')
    const screen = await render(<Settings />)

    await expect.element(screen.getByRole('switch', { name: 'Push notifications on this device' })).toBeDisabled()
    await expect
      .element(screen.getByText("Notifications are blocked for this site. Allow them in your browser's site settings to enable."))
      .toBeVisible()
  })
})
