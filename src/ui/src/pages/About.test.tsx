import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import About from './About'

describe('About', () => {
  it('renders the title and body copy', async () => {
    const screen = await render(<About />)

    await expect.element(screen.getByText('About', { exact: true })).toBeVisible()
    await expect.element(screen.getByText('Learn more about this project.')).toBeVisible()
  })
})
