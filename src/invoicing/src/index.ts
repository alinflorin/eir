import { CreateInvoiceRequested } from '../../domain/create-invoice-requested.js'
import { InvoiceCreated } from '../../domain/invoice-created.js'
import { configure } from './config.js'
import { onConnect, startRabbitMQ, consumeAny, publish } from './eventBus.js'

// Service identity — the only line that should need changing when this
// service is copied as a template for a new one. Also sets the dex
// client_id and the expected `<SERVICE_NAME>_CLIENT_SECRET` env var.
// Must run before eventBus/auth do anything, since they read it lazily.
configure('invoicing')

console.log('invoicing service starting')

onConnect(() => {
  void consumeAny(CreateInvoiceRequested, (request, requestedBy) => {
    console.log(`invoice requested by ${requestedBy}`, request)
    publish(new InvoiceCreated('asdasdasda'), requestedBy);
  })
})

startRabbitMQ()

console.log('invoicing service started')