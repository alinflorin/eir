import { Hamburger, Text, makeStyles, tokens } from '@fluentui/react-components'
import { Sparkle24Filled } from '@fluentui/react-icons'
import type { AuthContextProps } from 'react-oidc-context'
import UserMenu from './UserMenu'
import type { ThemePreference } from '../hooks/useThemePreference'

const useStyles = makeStyles({
  topbar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    height: '44px',
    flexShrink: 0,
    paddingInline: tokens.spacingHorizontalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    color: tokens.colorBrandForeground1,
  },
  logoText: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
    color: tokens.colorNeutralForeground1,
  },
  spacer: {
    flex: '1',
  },
})

type HeaderProps = {
  isMobile: boolean
  onToggleDrawer: () => void
  auth: AuthContextProps
  themePreference: ThemePreference
  onThemePreferenceChange: (next: ThemePreference) => void
}

function Header({ isMobile, onToggleDrawer, auth, themePreference, onThemePreferenceChange }: HeaderProps) {
  const styles = useStyles()

  return (
    <header className={styles.topbar}>
      {isMobile && <Hamburger onClick={onToggleDrawer} aria-label="Toggle navigation" />}
      <div className={styles.logo}>
        <Sparkle24Filled />
        <Text className={styles.logoText}>Eir</Text>
      </div>
      <div className={styles.spacer} />
      <UserMenu auth={auth} themePreference={themePreference} onThemePreferenceChange={onThemePreferenceChange} />
    </header>
  )
}

export default Header
