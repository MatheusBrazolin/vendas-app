import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirror the `@/*` → `src/*` alias from tsconfig.json so tests import
    // modules the same way the app does.
    alias: {
      '@': resolve(__dirname, './src'),
      // server-only throws at import time outside Next.js — stub it in tests
      'server-only': resolve(__dirname, './vitest.server-only-mock.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Focus coverage on logic we actually unit-test; UI and framework glue
      // are covered by E2E later, not chased here.
      include: [
        'src/lib/**',
        'src/app/**/actions.ts',
      ],
    },
  },
})
