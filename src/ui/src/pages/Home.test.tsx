import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import Home from './Home'

describe('Home', () => {
  it('renders the title and body copy', async () => {
    const screen = await render(<Home />)

    await expect.element(screen.getByText('Home', { exact: true })).toBeVisible()
    await expect.element(screen.getByText('Welcome to the app.')).toBeVisible()
  })
})
