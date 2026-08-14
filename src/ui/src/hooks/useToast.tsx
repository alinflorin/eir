import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import {
  Button,
  Toast,
  ToastBody,
  Toaster,
  ToastTitle,
  ToastTrigger,
  useId,
  useToastController,
  type ToastIntent,
} from '@fluentui/react-components'
import { Dismiss16Regular } from '@fluentui/react-icons'

export interface ShowToastOptions {
  title: string
  body?: string
  intent?: ToastIntent
}

interface ToastContextValue {
  showToast: (options: ShowToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const toasterId = useId('app-toaster')
  const { dispatchToast } = useToastController(toasterId)

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast: ({ title, body, intent = 'info' }) => {
        dispatchToast(
          <Toast>
            <ToastTitle
              action={
                <ToastTrigger>
                  <Button appearance="transparent" icon={<Dismiss16Regular />} size="small" aria-label="Close" />
                </ToastTrigger>
              }
            >
              {title}
            </ToastTitle>
            {body && <ToastBody>{body}</ToastBody>}
          </Toast>,
          { intent, timeout: 4000, pauseOnHover: true, pauseOnWindowBlur: true
           },
        )
      },
    }),
    [dispatchToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasterId={toasterId} />
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  const toastFct = useCallback((message: string, intent: ToastIntent = 'info', title?: string) => {
    return ctx.showToast({
      title: title || '',
      body: message,
      intent: intent
    });
  }, [ctx]);
  return toastFct;
}
