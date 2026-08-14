import { configure } from './config.js'
import { connectDb } from './db.js'
import { startRabbitMQ } from './eventBus.js'
import { startNotificationConsumers } from './notificationConsumers.js'
import { startPushSubscriptionConsumers } from './pushSubscriptionConsumers.js'
import { ensureIndexes } from './pushSubscriptionService.js'

configure('notifications')

console.log('service starting')

await connectDb()
await ensureIndexes()
startPushSubscriptionConsumers()
startNotificationConsumers()
startRabbitMQ()
console.log('service started')
