import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventBus } from '../hooks/useEventBus'
import { useToast } from '../hooks/useToast'
import { ExceptionOccurred } from '../../../domain/exception-occurred'

function GlobalErrorHandler() {
  const { subscribe } = useEventBus()
  const { t } = useTranslation()
  const toast = useToast()

  useEffect(() => {
    return subscribe(ExceptionOccurred, (exception) => {
      toast(t(exception.message), 'error', exception.title && t(exception.title))
    })
  }, [subscribe, t, toast])

  return null
}

export default GlobalErrorHandler
