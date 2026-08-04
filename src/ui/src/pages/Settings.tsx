import { Title1, Body1, Button } from '@fluentui/react-components'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventBus } from '../hooks/useEventBus'
import { InvoiceCreated } from '../../../domain/invoice-created'
import { CreateInvoiceRequested } from '../../../domain/create-invoice-requested'
import { useAuth } from 'react-oidc-context'

function Settings() {
  const { t } = useTranslation()
  const {publish, subscribe} = useEventBus();
  const a = useAuth();

  const test = useCallback(async () => {
    publish(new CreateInvoiceRequested('test'));
    a.signinSilent({
      forceIframeAuth: false,
      silentRequestTimeoutInSeconds: 5,
      scope: 'openid profile email'
    })
  }, [publish]);

  useEffect(() => {
    const unsub = subscribe(InvoiceCreated, i => {
      console.log(3, i);
    });
    return () => {
      unsub();
    }
  }, [subscribe]);

  return (
    <>
      <Title1>{t('pages.settings.title')}</Title1><br />
      <Body1 as="p">{t('pages.settings.body')}</Body1>
      <Button onClick={test}>sdfdsf</Button>
    </>
  )
}

export default Settings
