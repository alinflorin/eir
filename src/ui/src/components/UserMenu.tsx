import type { AuthContextProps } from 'react-oidc-context'
import { useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
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
  TranslateRegular,
} from '@fluentui/react-icons'
import type { ThemePreference } from '../hooks/useThemePreference'
import { supportedLanguages, type SupportedLanguage } from '../configs/i18nConfig'

type UserMenuProps = {
  auth: AuthContextProps
  themePreference: ThemePreference
  onThemePreferenceChange: (next: ThemePreference) => void
}

function UserMenu({ auth, themePreference, onThemePreferenceChange }: UserMenuProps) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const handleThemeCheckedValueChange: MenuProps['onCheckedValueChange'] = (_e, { checkedItems }) => {
    const next = checkedItems[0] as ThemePreference | undefined
    if (next) {
      onThemePreferenceChange(next)
    }
  }

  const handleLanguageCheckedValueChange: MenuProps['onCheckedValueChange'] = (_e, { checkedItems }) => {
    const next = checkedItems[0] as SupportedLanguage | undefined
    if (next) {
      void i18n.changeLanguage(next)
    }
  }

  const themeSubmenu = (
    <Menu checkedValues={{ theme: [themePreference] }} onCheckedValueChange={handleThemeCheckedValueChange}>
      <MenuTrigger disableButtonEnhancement>
        <MenuItem icon={<DarkThemeRegular />}>{t('theme.label')}</MenuItem>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuItemRadio name="theme" value="system" icon={<DesktopRegular />}>{t('theme.system')}</MenuItemRadio>
          <MenuItemRadio name="theme" value="light" icon={<WeatherSunnyRegular />}>{t('theme.light')}</MenuItemRadio>
          <MenuItemRadio name="theme" value="dark" icon={<WeatherMoonRegular />}>{t('theme.dark')}</MenuItemRadio>
        </MenuList>
      </MenuPopover>
    </Menu>
  )

  const languageSubmenu = (
    <Menu checkedValues={{ language: [i18n.resolvedLanguage ?? 'en'] }} onCheckedValueChange={handleLanguageCheckedValueChange}>
      <MenuTrigger disableButtonEnhancement>
        <MenuItem icon={<TranslateRegular />}>{t('language.label')}</MenuItem>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {supportedLanguages.map((lng) => (
            <MenuItemRadio key={lng} name="language" value={lng}>
              {t(`language.${lng}`)}
            </MenuItemRadio>
          ))}
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
            {languageSubmenu}
            <MenuItem
              icon={<PersonArrowRightRegular />}
              onClick={() => void auth.signinRedirect({ state: { returnTo: location.pathname + location.search } })}
            >
              {t('account.login')}
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
          {languageSubmenu}
          <MenuItem
            icon={<SignOutRegular />}
            onClick={() => {
              void auth.signoutSilent()
              navigate('/')
            }}
          >
            {t('account.logout')}
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  )
}

export default UserMenu
