import nodemailer, { type Transporter } from 'nodemailer'
import { getConfig } from './config.js'

let transporter: Transporter | undefined

function getTransporter(): Transporter {
  if (!transporter) {
    const { smtpHost, smtpPort, smtpUser, smtpPassword } = getConfig()
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      // The dummy dev SMTP server speaks plaintext, not TLS.
      secure: false,
      auth: smtpUser && smtpPassword ? { user: smtpUser, pass: smtpPassword } : undefined,
    })
  }
  return transporter
}

/**
 * Sends an HTML email from this service's configured from-address/name.
 * `text` is an optional plaintext fallback for clients that don't render HTML.
 */
export async function sendMail(to: string, subject: string, html: string, text?: string): Promise<void> {
  const { fromAddress, fromName } = getConfig()
  await getTransporter().sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    html,
    text,
  })
}
