import { startRabbitMQ } from './mq.js'

console.log('invoicing service starting')

startRabbitMQ()

setInterval(() => { console.log('invoicing live')}, 1000);
