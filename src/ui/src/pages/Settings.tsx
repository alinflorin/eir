import { Title1, Subtitle1, Body1, Spinner, Switch, Text, makeStyles, tokens } from '@fluentui/react-components'
import { useTranslation } from 'react-i18next'
import { usePushNotifications } from '../hooks/usePushNotifications'

const useStyles = makeStyles({
  section: {
    marginTop: tokens.spacingVerticalXXL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
})

function Settings() {
  const { t } = useTranslation()
  const styles = useStyles()
  const { state, enable, disable } = usePushNotifications()

  const busy = state === 'enabling' || state === 'disabling'
  const checked = state === 'enabled' || state === 'enabling'

  const handleChange = () => {
    if (checked) {
      void disable()
    } else {
      void enable()
    }
  }

  return (
    <>
      <Title1 as="h1">{t('pages.settings.title')}</Title1><br />
      <Body1 as="p">{t('pages.settings.body')}</Body1>

      <section className={styles.section}>
        <Subtitle1 as="h2">{t('pages.settings.notifications.title')}</Subtitle1>
        <div className={styles.row}>
          <Switch
            checked={checked}
            disabled={state === 'unsupported' || state === 'denied' || busy}
            onChange={handleChange}
            label={t('pages.settings.notifications.toggleLabel')}
          />
          {busy && <Spinner size="tiny" />}
        </div>
        {state === 'unsupported' && (
          <Text size={200}>{t('pages.settings.notifications.unsupported')}</Text>
        )}
        {state === 'denied' && (
          <Text size={200}>{t('pages.settings.notifications.denied')}</Text>
        )}
      </section>
    </>
  )
}

export default Settings
