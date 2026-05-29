import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import './globals.css'

/**
 * UI body font — variable weight, supports tnum/ss03 for tabular numbers
 * and a friendlier single-story "a". Covers Portuguese accents via latin-ext.
 */
const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

/**
 * Monospace font for product codes, IDs and printed receipts.
 * Wider, more readable than the default monospace stack.
 */
const jetBrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'VendasApp — Gestão de Vendas',
  description: 'Sistema de gestão de vendas e estoque',
  applicationName: 'VendasApp',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VendasApp',
  },
  // The web manifest is auto-linked by Next.js from `app/manifest.ts`,
  // but we still declare apple-touch-icon explicitly because iOS doesn't
  // read it from the manifest.
  icons: {
    apple: '/apple-touch-icon.png',
  },
}

// The theme-color drives the OS chrome (status bar / titlebar) when the
// app is installed as a PWA. Matches the dark sidebar so the installed
// app feels cohesive top-to-bottom.
export const viewport: Viewport = {
  themeColor: '#0f172a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster richColors position="top-right" />
        <ServiceWorkerRegister />
        <SpeedInsights />
      </body>
    </html>
  )
}
