import { CreateInvoiceRequested } from 'domain/create-invoice-requested.js'
import { InvoiceCreated } from 'domain/invoice-created.js'
import { configure } from 'service-common/config.js'
import { onConnect, startRabbitMQ, consumeAny, publish } from 'service-common/eventBus.js'

configure('invoicing')

console.log('service starting')

onConnect(() => {
  void consumeAny(CreateInvoiceRequested, (request, requestedBy) => {
    console.log(`invoice requested by ${requestedBy}`, request)
    publish(new InvoiceCreated('asdasdasda'), requestedBy);
  })
})

startRabbitMQ()
console.log('service started')