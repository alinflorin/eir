import { Title1, Body1 } from '@fluentui/react-components'
import { useTranslation } from 'react-i18next'

function Settings() {
  const { t } = useTranslation()

  return (
    <>
      <Title1 as="h1">{t('pages.settings.title')}</Title1><br />
      <Body1 as="p">{t('pages.settings.body')}</Body1>
    </>
  )
}

export default Settings
