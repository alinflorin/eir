import type { AuthContextProps } from 'react-oidc-context'
import {
  Avatar,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuItemRadio,
  Spinner,
} from '@fluentui/react-components'
import type { MenuProps } from '@fluentui/react-components'
import {
  PersonCircleRegular,
  SignOutRegular,
  PersonArrowRightRegular,
  DarkThemeRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
  DesktopRegular,
} from '@fluentui/react-icons'
import type { ThemePreference } from '../hooks/useThemePreference'

type UserMenuProps = {
  auth: AuthContextProps
  themePreference: ThemePreference
  onThemePreferenceChange: (next: ThemePreference) => void
}

function UserMenu({ auth, themePreference, onThemePreferenceChange }: UserMenuProps) {
  const handleThemeCheckedValueChange: MenuProps['onCheckedValueChange'] = (_e, { checkedItems }) => {
    const next = checkedItems[0] as ThemePreference | undefined
    if (next) {
      onThemePreferenceChange(next)
    }
  }

  const themeSubmenu = (
    <Menu checkedValues={{ theme: [themePreference] }} onCheckedValueChange={handleThemeCheckedValueChange}>
      <MenuTrigger disableButtonEnhancement>
        <MenuItem icon={<DarkThemeRegular />}>Theme</MenuItem>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuItemRadio name="theme" value="system" icon={<DesktopRegular />}>System</MenuItemRadio>
          <MenuItemRadio name="theme" value="light" icon={<WeatherSunnyRegular />}>Light</MenuItemRadio>
          <MenuItemRadio name="theme" value="dark" icon={<WeatherMoonRegular />}>Dark</MenuItemRadio>
        </MenuList>
      </MenuPopover>
    </Menu>
  )

  if (auth.isLoading) {
    return <Spinner size="tiny" />
  }

  if (!auth.isAuthenticated) {
    return (
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Avatar icon={<PersonCircleRegular />} aria-label="Account" />
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            {themeSubmenu}
            <MenuItem icon={<PersonArrowRightRegular />} onClick={() => void auth.signinRedirect()}>
              Login
            </MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>
    )
  }

  const name = auth.user?.profile.name ?? auth.user?.profile.email
  const email = auth.user?.profile.email

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <Avatar name={name} color="colorful" aria-label={name ?? 'Account'} />
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {(name || email) && (
            <MenuItem icon={<PersonCircleRegular />} disabled>
              {name ?? email}
            </MenuItem>
          )}
          {themeSubmenu}
          <MenuItem
            icon={<SignOutRegular />}
            onClick={() => void auth.signoutRedirect()}
          >
            Logout
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  )
}

export default UserMenu
