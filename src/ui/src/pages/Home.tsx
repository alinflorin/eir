import { Title1, Body1 } from '@fluentui/react-components'
import { useTranslation } from 'react-i18next'

function Home() {
  const { t } = useTranslation()
  return (
    <>
      <Title1>{t('pages.home.title')}</Title1><br />
      <Body1 as="p">{t('pages.home.body')}</Body1>
    </>
  )
}

export default Home
