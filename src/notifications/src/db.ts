import { MongoClient, type Db } from 'mongodb'
import { getConfig } from './config.js'

let db: Db | undefined

/**
 * Connects to mongodb and caches the database handle for getDb(). The
 * database is named after this service (getConfig().serviceName), so each
 * service that copies this template gets its own database for free.
 */
export async function connectDb(): Promise<Db> {
  if (db) return db
  const { mongoUrl, serviceName } = getConfig()
  const client = new MongoClient(mongoUrl)
  await client.connect()
  db = client.db(serviceName)
  return db
}

export function getDb(): Db {
  if (!db) {
    throw new Error('db not initialized: call connectDb() before using this module')
  }
  return db
}
