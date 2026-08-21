import { useEffect, useState, type ReactNode } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router'
import { useAuth } from 'react-oidc-context'
import { useTranslation } from 'react-i18next'
import { toDexLocale } from './configs/authConfig'
import { FluentProvider, Spinner, Text, makeStyles, tokens, webDarkTheme, webLightTheme } from '@fluentui/react-components'
import { useIsMobile } from './hooks/useIsMobile'
import { useThemePreference } from './hooks/useThemePreference'
import { useEventBus } from './hooks/useEventBus'
import { ToastProvider, useToast } from './hooks/useToast'
import { ConfirmProvider } from './hooks/useConfirm'
import { useServiceWorkerUpdate } from './hooks/useServiceWorkerUpdate'
import { usePushNotifications } from './hooks/usePushNotifications'
import GlobalErrorHandler from './components/GlobalErrorHandler'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Contact from './pages/Contact'
import About from './pages/About'
import Settings from './pages/Settings'

// Registers the service worker and drives the update/offline-ready UX;
// rendered with no output of its own, nested inside ToastProvider and
// ConfirmProvider so it can use both hooks.
function ServiceWorkerUpdater() {
  useServiceWorkerUpdate()
  return null
}

// Mounted once for the app's lifetime so push notification permission is
// auto-requested (at most once per login) as soon as the user is
// authenticated and the event bus connects, rather than on demand from a
// Settings page toggle. No output of its own; nested inside ToastProvider so
// it can show the enabled/disabled toast.
function PushNotificationRequester() {
  usePushNotifications()
  return null
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
  },
  body: {
    display: 'flex',
    flex: '1',
    minHeight: 0,
  },
  main: {
    flex: '1',
    minWidth: 0,
    overflow: 'auto',
    padding: tokens.spacingHorizontalS,
  },
  centered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: tokens.spacingVerticalM,
  },
})

function App() {
  const styles = useStyles()
  const { t, i18n } = useTranslation()
  const isMobile = useIsMobile()
  const { preference, setPreference, isDark } = useThemePreference()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = isDark ? webDarkTheme : webLightTheme
  const { connect, disconnect } = useEventBus()

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user?.state) {
      return
    }
    const { returnTo } = auth.user.state as { returnTo?: string }
    if (returnTo && returnTo !== location.pathname + location.search) {
      navigate(returnTo, { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated])

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.access_token) {
      connect(auth.user.access_token, auth.user.profile.name!)
    } else {
      disconnect()
    }
  }, [auth.isAuthenticated, auth.user, connect, disconnect])

  useEffect(() => {
    return auth.events.addAccessTokenExpired(() => {
      // automaticSilentRenew already attempts a renewal ~60s before expiry;
      // only step in here if that attempt is not still in flight, to avoid
      // firing a second, concurrent signinSilent() with the same refresh token.
      if (auth.activeNavigator !== 'signinSilent') {
        void auth.signinSilent()
      }
    })
  }, [auth.events, auth.signinSilent, auth.activeNavigator, auth])

  const handleLoginClick = () => {
    void auth.signinRedirect({
      state: { returnTo: location.pathname + location.search },
      extraQueryParams: { ui_locales: toDexLocale(i18n.language) },
    })
  }

  const handleLogoutClick = () => {
    void auth.removeUser()
    navigate('/')
  }

  let body: ReactNode
  if (auth.activeNavigator === 'signinSilent' || auth.activeNavigator === 'signoutRedirect') {
    body = (
      <div className={styles.centered}>
        <Spinner />
        <Text>{auth.activeNavigator === 'signinSilent' ? t('app.signingIn') : t('app.signingOut')}</Text>
      </div>
    )
  } else if (auth.isLoading) {
    body = (
      <div className={styles.centered}>
        <Spinner label={t('app.loading')} />
      </div>
    )
  } else if (auth.error) {
    body = <AuthErrorRedirect error={auth.error} onLoginClick={handleLoginClick} />
  } else {
    body = (
      <ConfirmProvider>
        <ServiceWorkerUpdater />
        <PushNotificationRequester />
        <div className={styles.root}>
          <Header
            isMobile={isMobile}
            onToggleDrawer={() => setDrawerOpen((open) => !open)}
            isAuthLoading={auth.isLoading}
            isAuthenticated={auth.isAuthenticated}
            name={auth.user?.profile.name}
            email={auth.user?.profile.email}
            themePreference={preference}
            onThemePreferenceChange={setPreference}
            onLoginClick={handleLoginClick}
            onLogoutClick={handleLogoutClick}
          />

          <div className={styles.body}>
            <Sidebar isMobile={isMobile} open={drawerOpen} onOpenChange={setDrawerOpen} />

            <main className={styles.main}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/about" element={<About />} />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>
          </div>
        </div>

        <GlobalErrorHandler />
      </ConfirmProvider>
    )
  }

  return (
    <FluentProvider theme={theme}>
      <ToastProvider>{body}</ToastProvider>
    </FluentProvider>
  )
}

// Auto-triggers a re-login redirect when session/auth errors occur (e.g. an
// expired or invalid session), surfacing the error via a toast rather than a
// dead-end error screen. Rendered inside ToastProvider so it can use useToast.
function AuthErrorRedirect({ error, onLoginClick }: { error: Error; onLoginClick: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()

  useEffect(() => {
    // Deferred a tick: on first mount the Toaster registers itself with
    // useToastController in its own effect, which runs after this one (it's
    // a later sibling in the tree) — dispatching synchronously here would
    // lose the race and drop the toast.
    const timer = setTimeout(() => {
      toast(t('app.authError', { message: error.message }), 'error', t('app.authErrorTitle'))
    }, 0)
    onLoginClick()
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  return null
}

export default App
