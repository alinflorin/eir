import { CreateInvoiceRequested } from '../../domain/create-invoice-requested.js'
import { onConnect, startRabbitMQ, consumeAny } from './mq.js'

console.log('invoicing service starting')

onConnect(() => {
  void consumeAny(CreateInvoiceRequested, (request, requestedBy) => {
    console.log(`invoice requested by ${requestedBy}`, request)
  })
})

startRabbitMQ()

setInterval(() => { console.log('invoicing live')}, 1000);
