import { Title1, Body1 } from '@fluentui/react-components'
import { useTranslation } from 'react-i18next'

function About() {
  const { t } = useTranslation()
  return (
    <>
      <Title1>{t('pages.about.title')}</Title1><br />
      <Body1 as="p">{t('pages.about.body')}</Body1>
    </>
  )
}

export default About
