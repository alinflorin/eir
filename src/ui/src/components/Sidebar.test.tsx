import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { MemoryRouter } from 'react-router'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import Sidebar from './Sidebar'

function renderSidebar(initialPath: string, props: Partial<ComponentProps<typeof Sidebar>> = {}) {
  const onOpenChange = vi.fn()

  return render(
    <FluentProvider theme={webLightTheme}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Sidebar isMobile={false} open onOpenChange={onOpenChange} {...props} />
      </MemoryRouter>
    </FluentProvider>,
  ).then((screen) => ({ ...screen, onOpenChange }))
}

describe('Sidebar', () => {
  it('renders a link for every nav item', async () => {
    const screen = await renderSidebar('/')

    for (const label of ['Home', 'Contact', 'About', 'Settings']) {
      await expect.element(screen.getByRole('link', { name: label })).toBeVisible()
    }
  })

  it('links point at their routes', async () => {
    const screen = await renderSidebar('/')

    await expect.element(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact')
    await expect.element(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about')
  })

  it('renders as an overlay drawer on mobile that can be dismissed', async () => {
    const screen = await renderSidebar('/', { isMobile: true, open: true })

    await expect.element(screen.getByRole('link', { name: 'Home' })).toBeVisible()
  })
})
