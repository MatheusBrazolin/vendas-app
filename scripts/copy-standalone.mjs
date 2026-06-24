import { cp } from 'node:fs/promises'

// Next.js standalone output doesn't include static assets — copy them in.
await cp('.next/static', '.next/standalone/.next/static', { recursive: true })
await cp('public', '.next/standalone/public', { recursive: true })
console.log('standalone assets copied')
