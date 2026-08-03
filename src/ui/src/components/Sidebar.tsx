import { Link, useLocation } from 'react-router'
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
  { to: '/', label: 'Home', icon: Home24Regular, activeIcon: Home24Filled },
  { to: '/contact', label: 'Contact', icon: Mail24Regular, activeIcon: Mail24Filled },
  { to: '/about', label: 'About', icon: Info24Regular, activeIcon: Info24Filled },
  { to: '/settings', label: 'Settings', icon: Settings24Regular, activeIcon: Settings24Filled },
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

function NavLinks() {
  const styles = useStyles()
  const location = useLocation()

  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map(({ to, label, icon: Icon, activeIcon: ActiveIcon }) => {
        const isActive = location.pathname === to
        return (
          <Link
            key={to}
            to={to}
            className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
          >
            {isActive ? <ActiveIcon /> : <Icon />}
            {label}
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
          <NavLinks />
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
