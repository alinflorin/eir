import { useState } from 'react'
import { Route, Routes } from 'react-router'
import { useAuth } from 'react-oidc-context'
import { FluentProvider, Spinner, Text, makeStyles, tokens, webDarkTheme, webLightTheme } from '@fluentui/react-components'
import { useIsMobile } from './hooks/useIsMobile'
import { useThemePreference } from './hooks/useThemePreference'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
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
    padding: tokens.spacingHorizontalXXL,
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
  const isMobile = useIsMobile()
  const { preference, setPreference, isDark } = useThemePreference()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const auth = useAuth()
  const theme = isDark ? webDarkTheme : webLightTheme

  if (auth.activeNavigator === 'signinSilent' || auth.activeNavigator === 'signoutRedirect') {
    return (
      <FluentProvider theme={theme}>
        <div className={styles.centered}>
          <Spinner />
          <Text>{auth.activeNavigator === 'signinSilent' ? 'Signing you in…' : 'Signing you out…'}</Text>
        </div>
      </FluentProvider>
    )
  }

  if (auth.isLoading) {
    return (
      <FluentProvider theme={theme}>
        <div className={styles.centered}>
          <Spinner label="Loading…" />
        </div>
      </FluentProvider>
    )
  }

  if (auth.error) {
    return (
      <FluentProvider theme={theme}>
        <div className={styles.centered}>
          <Text>Authentication error: {auth.error.message}</Text>
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
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </FluentProvider>
  )
}

export default App
