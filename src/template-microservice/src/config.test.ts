import { describe, expect, it } from 'vitest'
import { configure, getConfig } from './config.js'

// A minimal smoke test to get the test toolchain wired up for this service;
// expand with real coverage as template-microservice grows business logic worth testing.
describe('config', () => {
  it('throws until configure() has been called', () => {
    expect(() => getConfig()).toThrow(/not initialized/)
  })

  it('exposes the service name passed to configure()', () => {
    configure('template-microservice')

    expect(getConfig().serviceName).toBe('template-microservice')
  })
})
