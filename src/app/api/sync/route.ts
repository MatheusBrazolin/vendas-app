import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/roles'
import { isElectron } from '@/lib/db/client'
import { runSync } from '@/lib/db/sync'

export async function POST() {
  if (!isElectron()) {
    return NextResponse.json({ error: 'Sync only available in Electron mode' }, { status: 404 })
  }

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runSync()
  return NextResponse.json(result, { status: result.pulled ? 200 : 503 })
}

export async function GET() {
  if (!isElectron()) {
    return NextResponse.json({ error: 'Sync only available in Electron mode' }, { status: 404 })
  }

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = (await import('@/lib/db/client')).getDb()
  const meta = db
    .prepare(`SELECT last_synced_at FROM sync_meta WHERE table_name = 'all'`)
    .get() as { last_synced_at: string } | undefined

  const pending = (
    db
      .prepare(`SELECT COUNT(*) AS count FROM sync_queue WHERE status = 'pending'`)
      .get() as { count: number }
  ).count

  return NextResponse.json({ lastSyncedAt: meta?.last_synced_at ?? null, pendingQueueItems: pending })
}
