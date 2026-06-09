import { createServiceClient, isInternalEmail } from '@/lib/supabase/service'

/**
 * Parses a comma/semicolon-separated env value into a clean, deduped,
 * lowercased list of email addresses. Pure + exported for testing.
 */
export function parseRecipientList(value: string | undefined): string[] {
  if (!value) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of value.split(/[,;]/)) {
    const email = part.trim().toLowerCase()
    if (email && email.includes('@') && !seen.has(email)) {
      seen.add(email)
      out.push(email)
    }
  }
  return out
}

/**
 * Keeps only addresses that can actually receive mail: non-empty, real
 * (not the internal `@vendas-app.interno` usernames), deduped. Pure.
 */
export function pickDeliverableEmails(emails: (string | null | undefined)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of emails) {
    const email = raw?.trim().toLowerCase()
    if (email && email.includes('@') && !isInternalEmail(email) && !seen.has(email)) {
      seen.add(email)
      out.push(email)
    }
  }
  return out
}

/**
 * Merges the three recipient sources into one deliverable list. Pure +
 * exported so the merge behavior can be unit-tested without hitting Supabase.
 *
 *   1. admin account emails (internal usernames are filtered out downstream)
 *   2. the REPORT_EMAIL env value (comma/semicolon-separated)
 *   3. active addresses managed via the admin UI (report_recipients table)
 *
 * `pickDeliverableEmails` dedupes case-insensitively and drops internal/empty
 * addresses, so the three sources can overlap freely.
 */
export function mergeReportRecipients(
  adminEmails: (string | null | undefined)[],
  envValue: string | undefined,
  dbEmails: (string | null | undefined)[],
): string[] {
  return pickDeliverableEmails([
    ...adminEmails,
    ...parseRecipientList(envValue),
    ...dbEmails,
  ])
}

/**
 * Resolves who should receive the daily report by merging:
 *   1. every admin whose account has a REAL email (internal usernames skipped)
 *   2. any address listed in REPORT_EMAIL (comma-separated)
 *   3. active addresses managed by admins in the report_recipients table
 *
 * The REPORT_EMAIL override exists because admins created in-app log in by
 * username and have no real inbox — set it to the owner's real address to
 * guarantee delivery. The table lets admins add/remove extra recipients in-app.
 */
export async function getReportRecipients(): Promise<string[]> {
  const service = createServiceClient()

  const { data: adminRoles, error: rolesError } = await service
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')

  if (rolesError) throw new Error(rolesError.message)
  const adminIds = new Set((adminRoles ?? []).map((r) => r.user_id))

  // listUsers paginates (default 50); 1000 covers any realistic small shop.
  const { data: usersData, error: usersError } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (usersError) throw new Error(usersError.message)

  const adminEmails = (usersData?.users ?? [])
    .filter((u) => adminIds.has(u.id))
    .map((u) => u.email)

  const { data: dbRows, error: dbError } = await service
    .from('report_recipients')
    .select('email')
    .eq('active', true)
  if (dbError) throw new Error(dbError.message)
  const dbEmails = (dbRows ?? []).map((r) => r.email)

  return mergeReportRecipients(adminEmails, process.env.REPORT_EMAIL, dbEmails)
}
