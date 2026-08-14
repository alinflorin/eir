import { CreateInvoiceRequested } from '../../domain/create-invoice-requested.js'
import { ExceptionOccurred } from '../../domain/exception-occurred.js'
import { InvoiceCreated } from '../../domain/invoice-created.js'
import { configure } from './config.js'
import { onConnect, startRabbitMQ, consumeAny, publish } from './eventBus.js'

configure('invoicing')

console.log('service starting')

onConnect(() => {
  void consumeAny(CreateInvoiceRequested, 'users', (request, requestedBy) => {
    console.log(`invoice requested by ${requestedBy}`, request)
    publish(new ExceptionOccurred("mesaj", 'titlu'), { user: requestedBy });
    publish(new InvoiceCreated('asdasdasda'), { user: requestedBy });
  }, 10000)
})

startRabbitMQ()
console.log('service started')