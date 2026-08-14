import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendMailMock = vi.fn().mockResolvedValue(undefined)
const createTransport = vi.fn().mockReturnValue({ sendMail: sendMailMock })

vi.mock('nodemailer', () => ({ default: { createTransport } }))

// mailer.ts caches its transporter in a module-level singleton, so each test
// that cares about how the transporter was constructed needs its own fresh
// module instance — and config.js must be re-imported alongside it (also a
// singleton), or configure() would be setting a different instance's state.
async function freshMailer() {
  vi.resetModules()
  const { configure } = await import('./config.js')
  const mailer = await import('./mailer.js')
  return { configure, ...mailer }
}

describe('mailer', () => {
  beforeEach(() => {
    createTransport.mockClear()
    sendMailMock.mockClear()
  })

  it('creates a transporter from the configured smtp settings, with auth when credentials are set', async () => {
    process.env.SMTP_USER = 'notifications'
    process.env.SMTP_PASSWORD = 'somesecret'
    const { configure, sendMail } = await freshMailer()
    configure('notifications')

    await sendMail('someone@example.com', 'Hello', '<p>Hi</p>')

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp',
        port: 1025,
        secure: false,
        auth: { user: 'notifications', pass: 'somesecret' },
      }),
    )
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASSWORD
  })

  it('omits auth when no smtp credentials are configured', async () => {
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASSWORD
    const { configure, sendMail } = await freshMailer()
    configure('notifications')

    await sendMail('someone@example.com', 'Hello', '<p>Hi</p>')

    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ auth: undefined }))
  })

  it('sends the mail from the configured from-address/name', async () => {
    process.env.FROM_ADDRESS = 'noreply@eir.localhost'
    process.env.FROM_NAME = 'Eir'
    const { configure, sendMail } = await freshMailer()
    configure('notifications')

    await sendMail('someone@example.com', 'Hello', '<p>Hi</p>', 'Hi')

    expect(sendMailMock).toHaveBeenCalledWith({
      from: '"Eir" <noreply@eir.localhost>',
      to: 'someone@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
      text: 'Hi',
    })
    delete process.env.FROM_ADDRESS
    delete process.env.FROM_NAME
  })

  it('reuses the same transporter across calls', async () => {
    const { configure, sendMail } = await freshMailer()
    configure('notifications')

    await sendMail('a@example.com', 'A', '<p>A</p>')
    await sendMail('b@example.com', 'B', '<p>B</p>')

    expect(createTransport).toHaveBeenCalledOnce()
  })
})
