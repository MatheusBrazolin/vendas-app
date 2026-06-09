import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCashClose } from '@/lib/queries/cash-close'
import { todayBRISO } from '@/lib/utils/datetime'
import { buildCashCloseEmail } from '@/lib/email/cash-close-email'
import { getReportRecipients } from '@/lib/email/report-recipients'
import { sendMail, isSmtpConfigured } from '@/lib/email/mailer'

// nodemailer needs the Node runtime (not Edge); never cache this route.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Daily cash-close report.
 *
 * Triggered by Vercel Cron (see vercel.json) at 23:00 UTC = 20:00 BRT.
 * Vercel automatically sends `Authorization: Bearer $CRON_SECRET`, so we
 * reject any request without the matching secret — this endpoint must never
 * be publicly runnable.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET não configurado no servidor.' },
      { status: 500 },
    )
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Não autorizado.' }, { status: 401 })
  }

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'SMTP não configurado (SMTP_HOST/USER/PASS/FROM).' },
      { status: 500 },
    )
  }

  try {
    const day = todayBRISO()
    const service = createServiceClient()

    // Service-role client: no user session in a cron, so bypass RLS safely.
    const summary = await getCashClose(day, service)
    const recipients = await getReportRecipients()

    if (recipients.length === 0) {
      return NextResponse.json({
        ok: true,
        skipped: 'Nenhum destinatário com email real. Defina REPORT_EMAIL.',
        date: day,
      })
    }

    const email = buildCashCloseEmail(summary)
    await sendMail({
      to: recipients,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })

    return NextResponse.json({
      ok: true,
      date: day,
      sales: summary.count,
      total: summary.total,
      sentTo: recipients.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado.'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
