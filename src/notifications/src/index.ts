import { configure } from './config.js'
import { startRabbitMQ } from './eventBus.js'

configure('notifications')

console.log('service starting')

startRabbitMQ()
console.log('service started')
