import { beforeEach, describe, expect, it, vi } from 'vitest'

const connect = vi.fn()
const db = vi.fn()
const MongoClient = vi.fn().mockImplementation(function MongoClient() {
  return { connect, db }
})

vi.mock('mongodb', () => ({ MongoClient }))

// db.ts caches the mongo Db handle in a module-level singleton, and reads
// from config.js's own singleton — so each test needing fresh state
// re-imports both together, and configures on that same fresh instance.
async function freshDb() {
  vi.resetModules()
  const { configure } = await import('./config.js')
  configure('notifications')
  return import('./db.js')
}

describe('db', () => {
  beforeEach(() => {
    connect.mockReset().mockResolvedValue(undefined)
    db.mockReset()
    MongoClient.mockClear()
  })

  it('throws until connectDb() has been called', async () => {
    const { getDb } = await freshDb()
    expect(() => getDb()).toThrow(/not initialized/)
  })

  it('connects using the configured mongoUrl and names the database after the service', async () => {
    const fakeDb = { name: 'notifications-db' }
    db.mockReturnValue(fakeDb)

    const { connectDb, getDb } = await freshDb()
    const result = await connectDb()

    expect(MongoClient).toHaveBeenCalledWith(expect.stringContaining('mongodb://'))
    expect(connect).toHaveBeenCalledOnce()
    expect(db).toHaveBeenCalledWith('notifications')
    expect(result).toBe(fakeDb)
    expect(getDb()).toBe(fakeDb)
  })

  it('reuses the cached connection on subsequent calls', async () => {
    db.mockReturnValue({})

    const { connectDb } = await freshDb()
    await connectDb()
    await connectDb()

    expect(MongoClient).toHaveBeenCalledOnce()
    expect(connect).toHaveBeenCalledOnce()
  })
})
