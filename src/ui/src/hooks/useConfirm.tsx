import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  type ButtonProps,
} from '@fluentui/react-components'
import { useTranslation } from 'react-i18next'

export interface ConfirmOptions {
  message: string
  /** Defaults to the i18n `confirm.defaultTitle` string. */
  title?: string
  /** Defaults to the i18n `confirm.confirmButton` string. */
  confirmText?: string
  /** Defaults to the i18n `confirm.cancelButton` string. */
  cancelText?: string
  /** Appearance of the confirm button, e.g. `'primary'` or `'danger'` styling via a subtle/outline pair. */
  confirmAppearance?: ButtonProps['appearance']
}

interface ConfirmContextValue {
  /** Resolves to `true` if the user confirmed, `false` if they cancelled or dismissed the dialog. */
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

interface PendingConfirm {
  title: string
  message: string
  confirmText: string
  cancelText: string
  confirmAppearance: ButtonProps['appearance']
  resolve: (result: boolean) => void
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({
          title: options.title ?? t('confirm.defaultTitle'),
          message: options.message,
          confirmText: options.confirmText ?? t('confirm.confirmButton'),
          cancelText: options.cancelText ?? t('confirm.cancelButton'),
          confirmAppearance: options.confirmAppearance ?? 'primary',
          resolve,
        })
      }),
    [t],
  )

  const settle = useCallback((result: boolean) => {
    setPending((prev) => {
      prev?.resolve(result)
      return null
    })
  }, [])

  const value = useMemo<ConfirmContextValue>(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog
        open={pending !== null}
        onOpenChange={(_, data) => {
          if (!data.open) settle(false)
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{pending?.title}</DialogTitle>
            <DialogContent>{pending?.message}</DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => settle(false)}>
                {pending?.cancelText}
              </Button>
              <Button appearance={pending?.confirmAppearance} onClick={() => settle(true)}>
                {pending?.confirmText}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return ctx.confirm
}
