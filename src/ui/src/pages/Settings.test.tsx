import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import Settings from './Settings'

describe('Settings', () => {
  it('renders the settings page', async () => {
    const screen = await render(<Settings />)

    await expect.element(screen.getByText('Settings')).toBeVisible()
  })
})
