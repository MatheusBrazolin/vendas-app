import nodemailer from 'nodemailer'

/**
 * SMTP-based mailer. Configured entirely via environment variables so no
 * credentials live in the repo. Used by server-only code (cron routes,
 * server actions) — never import this from client components.
 *
 * Required env:
 *   SMTP_HOST      e.g. smtp.gmail.com
 *   SMTP_PORT      e.g. 465 (SSL) or 587 (STARTTLS)
 *   SMTP_USER      the login (usually the full email address)
 *   SMTP_PASS      password or app-password (Gmail requires an app password)
 *   SMTP_FROM      the "From" header, e.g. "VendasApp <loja@gmail.com>"
 * Optional:
 *   SMTP_SECURE    "true" forces TLS-on-connect (defaults to true when port=465)
 */

export interface MailMessage {
  to: string[]
  subject: string
  html: string
  text: string
}

/** Thrown when SMTP env vars are missing — surfaced so cron logs are clear. */
export class SmtpNotConfiguredError extends Error {
  constructor() {
    super('SMTP não configurado (defina SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM).')
    this.name = 'SmtpNotConfiguredError'
  }
}

interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

/** Reads + validates SMTP config from env, or throws SmtpNotConfiguredError. */
function readConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM

  if (!host || !user || !pass || !from) {
    throw new SmtpNotConfiguredError()
  }

  const port = Number(process.env.SMTP_PORT ?? 465)
  // Default to secure when on the implicit-TLS port; allow override.
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : port === 465

  return { host, port, secure, user, pass, from }
}

/** Sends one message to one or more recipients. Throws on transport failure. */
export async function sendMail(message: MailMessage): Promise<void> {
  const config = readConfig()

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  })

  await transporter.sendMail({
    from: config.from,
    to: message.to.join(', '),
    subject: message.subject,
    text: message.text,
    html: message.html,
  })
}

/** True when the minimum SMTP env is present (no throw). */
export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM,
  )
}
