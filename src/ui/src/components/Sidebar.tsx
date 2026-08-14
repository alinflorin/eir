import { Link, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { InlineDrawer, OverlayDrawer, DrawerBody, makeStyles, tokens } from '@fluentui/react-components'
import {
  Home24Regular,
  Home24Filled,
  Mail24Regular,
  Mail24Filled,
  Info24Regular,
  Info24Filled,
  Settings24Regular,
  Settings24Filled,
} from '@fluentui/react-icons'

const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.home', icon: Home24Regular, activeIcon: Home24Filled },
  { to: '/contact', labelKey: 'nav.contact', icon: Mail24Regular, activeIcon: Mail24Filled },
  { to: '/about', labelKey: 'nav.about', icon: Info24Regular, activeIcon: Info24Filled },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings24Regular, activeIcon: Settings24Filled },
]

const useStyles = makeStyles({
  drawer: {
    width: '200px',
  },
  drawerBody: {
    padding: tokens.spacingHorizontalXS,
    '&:first-child': {
      paddingTop: tokens.spacingHorizontalXS,
    },
    '&:last-child': {
      paddingBottom: tokens.spacingHorizontalXS,
    },
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingHorizontalXS,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForeground2,
    textDecorationLine: 'none',
    fontSize: tokens.fontSizeBase300,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  navLinkActive: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    color: tokens.colorNeutralForeground2BrandSelected,
    fontWeight: tokens.fontWeightSemibold,
  },
})

type NavLinksProps = {
  onNavigate?: () => void
}

function NavLinks({ onNavigate }: NavLinksProps) {
  const styles = useStyles()
  const location = useLocation()
  const { t } = useTranslation()

  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map(({ to, labelKey, icon: Icon, activeIcon: ActiveIcon }) => {
        const isActive = location.pathname === to
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
          >
            {isActive ? <ActiveIcon /> : <Icon />}
            {t(labelKey)}
          </Link>
        )
      })}
    </nav>
  )
}

type SidebarProps = {
  isMobile: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

function Sidebar({ isMobile, open, onOpenChange }: SidebarProps) {
  const styles = useStyles()

  if (isMobile) {
    return (
      <OverlayDrawer
        className={styles.drawer}
        open={open}
        onOpenChange={(_, data) => onOpenChange(data.open)}
        position="start"
      >
        <DrawerBody className={styles.drawerBody}>
          <NavLinks onNavigate={() => onOpenChange(false)} />
        </DrawerBody>
      </OverlayDrawer>
    )
  }

  return (
    <InlineDrawer className={styles.drawer} open position="start">
      <DrawerBody className={styles.drawerBody}>
        <NavLinks />
      </DrawerBody>
    </InlineDrawer>
  )
}

export default Sidebar
