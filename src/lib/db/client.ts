import 'server-only'
import { initSchema } from './schema'

export function isElectron(): boolean {
  return process.env.ELECTRON_APP === 'true'
}

// Minimal interface — we cannot use `import type Database from 'better-sqlite3'`
// under moduleResolution:bundler because TS2709 (export= treated as namespace).
// The actual module is loaded lazily via require() so web/Vercel builds are unaffected.
export interface NxStatement {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run(...params: any[]): { changes: number; lastInsertRowid: number | bigint }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(...params: any[]): any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  all(...params: any[]): any[]
}

export interface NxDB {
  prepare(sql: string): NxStatement
  exec(sql: string): void
  pragma(source: string, simplify?: boolean): unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transaction(fn: (...args: any[]) => any): (...args: any[]) => any
  close(): void
}

let _db: NxDB | null = null

export function getDb(): NxDB {
  if (_db) return _db

  const dbPath = process.env.DB_PATH
  if (!dbPath) throw new Error('DB_PATH environment variable is not set')

  // Dynamic require prevents the Next.js bundler from inlining this native addon.
  // serverExternalPackages: ['better-sqlite3'] in next.config.ts is a belt-and-suspenders guard.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3') as new (path: string) => NxDB
  _db = new Database(dbPath)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  initSchema(_db)

  return _db
}
