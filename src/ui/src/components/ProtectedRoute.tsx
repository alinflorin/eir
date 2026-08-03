import { type ReactNode, useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { useAuth } from 'react-oidc-context'
import { Spinner, makeStyles, tokens } from '@fluentui/react-components'

const useStyles = makeStyles({
  centered: {
    display: 'flex',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXXL,
  },
})

type ProtectedRouteProps = {
  children: ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const styles = useStyles()
  const auth = useAuth()
  const location = useLocation()
  const signinRequested = useRef(false)

  const shouldSignIn = !auth.isLoading && !auth.isAuthenticated && !auth.activeNavigator && !auth.error

  useEffect(() => {
    if (shouldSignIn && !signinRequested.current) {
      signinRequested.current = true
      void auth.signinRedirect({
        state: { returnTo: location.pathname + location.search },
      })
    } else if (!shouldSignIn) {
      signinRequested.current = false
    }
  }, [shouldSignIn, auth, location])

  if (!auth.isAuthenticated) {
    return (
      <div className={styles.centered}>
        <Spinner label="Signing you in…" />
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
