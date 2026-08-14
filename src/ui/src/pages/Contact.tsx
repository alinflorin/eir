import { Title1, Body1 } from '@fluentui/react-components'
import { useTranslation } from 'react-i18next'

function Contact() {
  const { t } = useTranslation()
  return (
    <>
      <Title1 as="h1">{t('pages.contact.title')}</Title1><br />
      <Body1 as="p">{t('pages.contact.body')}</Body1>
    </>
  )
}

export default Contact
