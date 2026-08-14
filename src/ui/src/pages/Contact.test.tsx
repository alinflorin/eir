import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import Contact from './Contact'

describe('Contact', () => {
  it('renders the title and body copy', async () => {
    const screen = await render(<Contact />)

    await expect.element(screen.getByText('Contact', { exact: true })).toBeVisible()
    await expect.element(screen.getByText('Get in touch with us.')).toBeVisible()
  })
})
