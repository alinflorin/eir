// A controllable stand-in for 'virtual:pwa-register/react', for tests that
// need to drive needRefresh/offlineReady transitions and assert on
// updateServiceWorker / onRegisteredSW / onRegisterError calls (see
// useServiceWorkerUpdate.test.tsx). Distinct from
// test-mocks/pwaRegisterReact.ts, the static stub aliased for every other
// test in vitest.config.ts.
import { useSyncExternalStore } from 'react'
import { vi } from 'vitest'

type Listener = () => void
type RegisterSWOptions = {
  onRegisteredSW?: (url: string, registration: { update: () => void } | undefined) => void
  onRegisterError?: (error: unknown) => void
}

let needRefresh = false
let offlineReady = false
const listeners = new Set<Listener>()

export const updateServiceWorkerMock = vi.fn(async () => {})
let lastOptions: RegisterSWOptions | undefined

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit() {
  listeners.forEach((listener) => listener())
}

export function useRegisterSW(options?: RegisterSWOptions) {
  // eslint-disable-next-line react-hooks/globals
  lastOptions = options
  const needRefreshValue = useSyncExternalStore(subscribe, () => needRefresh)
  const offlineReadyValue = useSyncExternalStore(subscribe, () => offlineReady)

  return {
    needRefresh: [needRefreshValue, setNeedRefresh] as [boolean, typeof setNeedRefresh],
    offlineReady: [offlineReadyValue, setOfflineReady] as [boolean, typeof setOfflineReady],
    updateServiceWorker: updateServiceWorkerMock,
  }
}

function setNeedRefresh(value: boolean) {
  needRefresh = value
  emit()
}

function setOfflineReady(value: boolean) {
  offlineReady = value
  emit()
}

export function __setNeedRefresh(value: boolean) {
  setNeedRefresh(value)
}

export function __setOfflineReady(value: boolean) {
  setOfflineReady(value)
}

export function __triggerOnRegisteredSW(registration: { update: () => void } | undefined) {
  lastOptions?.onRegisteredSW?.('/sw.js', registration)
}

export function __triggerOnRegisterError(error: unknown) {
  lastOptions?.onRegisterError?.(error)
}

export function __reset() {
  needRefresh = false
  offlineReady = false
  lastOptions = undefined
  updateServiceWorkerMock.mockClear()
}
