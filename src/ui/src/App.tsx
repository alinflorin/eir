import { useEffect, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router'
import { useAuth } from 'react-oidc-context'
import { useTranslation } from 'react-i18next'
import { FluentProvider, Spinner, Text, makeStyles, tokens, webDarkTheme, webLightTheme } from '@fluentui/react-components'
import { useIsMobile } from './hooks/useIsMobile'
import { useThemePreference } from './hooks/useThemePreference'
import { useEventBus } from './hooks/useEventBus'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Contact from './pages/Contact'
import About from './pages/About'
import Settings from './pages/Settings'

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
  const { t } = useTranslation()
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
  }, [auth.isAuthenticated, auth.user, location, navigate])

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.access_token) {
      connect(auth.user.access_token, auth.user.profile.sub)
    } else {
      disconnect()
    }
  }, [auth.isAuthenticated, auth.user, connect, disconnect])

  if (auth.activeNavigator === 'signinSilent' || auth.activeNavigator === 'signoutRedirect') {
    return (
      <FluentProvider theme={theme}>
        <div className={styles.centered}>
          <Spinner />
          <Text>{auth.activeNavigator === 'signinSilent' ? t('app.signingIn') : t('app.signingOut')}</Text>
        </div>
      </FluentProvider>
    )
  }

  if (auth.isLoading) {
    return (
      <FluentProvider theme={theme}>
        <div className={styles.centered}>
          <Spinner label={t('app.loading')} />
        </div>
      </FluentProvider>
    )
  }

  if (auth.error) {
    return (
      <FluentProvider theme={theme}>
        <div className={styles.centered}>
          <Text>{t('app.authError', { message: auth.error.message })}</Text>
        </div>
      </FluentProvider>
    )
  }

  return (
    <FluentProvider theme={theme}>
      <div className={styles.root}>
        <Header
          isMobile={isMobile}
          onToggleDrawer={() => setDrawerOpen((open) => !open)}
          auth={auth}
          themePreference={preference}
          onThemePreferenceChange={setPreference}
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
    </FluentProvider>
  )
}

export default App
