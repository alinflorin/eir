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
  isLoading: boolean
  isAuthenticated: boolean
  name?: string
  email?: string
  themePreference: ThemePreference
  onThemePreferenceChange: (next: ThemePreference) => void
  onLoginClick: () => void
  onLogoutClick: () => void
}

function UserMenu({
  isLoading,
  isAuthenticated,
  name,
  email,
  themePreference,
  onThemePreferenceChange,
  onLoginClick,
  onLogoutClick,
}: UserMenuProps) {
  const { t, i18n } = useTranslation()

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

  if (isLoading) {
    return <Spinner size="tiny" />
  }

  if (!isAuthenticated) {
    return (
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Avatar icon={<PersonCircleRegular />} aria-label="Account" />
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            {themeSubmenu}
            {languageSubmenu}
            <MenuItem icon={<PersonArrowRightRegular />} onClick={onLoginClick}>
              {t('account.login')}
            </MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>
    )
  }

  const displayName = name ?? email

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <Avatar name={displayName} color="colorful" aria-label={displayName ?? 'Account'} />
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {displayName && (
            <MenuItem icon={<PersonCircleRegular />} disabled>
              {displayName}
            </MenuItem>
          )}
          {themeSubmenu}
          {languageSubmenu}
          <MenuItem icon={<SignOutRegular />} onClick={onLogoutClick}>
            {t('account.logout')}
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  )
}

export default UserMenu
