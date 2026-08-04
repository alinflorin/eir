import { CreateInvoiceRequested } from '../../domain/create-invoice-requested.js'
import { InvoiceCreated } from '../../domain/invoice-created.js'
import { onConnect, startRabbitMQ, consumeAny, publish } from './eventBus.js'

console.log('invoicing service starting')

onConnect(() => {
  void consumeAny(CreateInvoiceRequested, (request, requestedBy) => {
    console.log(`invoice requested by ${requestedBy}`, request)
    publish(new InvoiceCreated('asdasdasda'), requestedBy);
  })
})

startRabbitMQ()

console.log('invoicing service started')