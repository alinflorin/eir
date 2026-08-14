import { configure } from './config.js'
import { connectDb } from './db.js'
import { startRabbitMQ } from './eventBus.js'
import { startNotificationConsumers } from './notificationConsumers.js'
import { startNotificationListConsumers } from './notificationListConsumers.js'
import { ensureIndexes as ensureNotificationIndexes } from './notificationService.js'
import { startPushSubscriptionConsumers } from './pushSubscriptionConsumers.js'
import { ensureIndexes as ensurePushSubscriptionIndexes } from './pushSubscriptionService.js'

configure('notifications')

console.log('service starting')

await connectDb()
await ensurePushSubscriptionIndexes()
await ensureNotificationIndexes()
startPushSubscriptionConsumers()
startNotificationConsumers()
startNotificationListConsumers()
startRabbitMQ()
console.log('service started')
