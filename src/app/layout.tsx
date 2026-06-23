import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Poppins } from 'next/font/google'
import { cookies } from 'next/headers'
import { Toaster } from 'sonner'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import './globals.css'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const jetBrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600'],
})

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  display: 'swap',
  weight: ['600', '700', '800'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://nexsales-pdv.vercel.app'),
  title: 'NexSales — Smart Sales Platform',
  description: 'Plataforma moderna de gestão de vendas, clientes e performance do seu negócio.',
  applicationName: 'NexSales',
  keywords: ['PDV', 'ponto de venda', 'gestão de vendas', 'clientes', 'relatórios', 'NexSales'],
  authors: [{ name: 'NexSales' }],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    title: 'NexSales — Smart Sales Platform',
    description: 'Plataforma moderna de gestão de vendas, clientes e performance do seu negócio.',
    siteName: 'NexSales',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NexSales — Smart Sales Platform',
    description: 'Plataforma moderna de gestão de vendas, clientes e performance do seu negócio.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NexSales',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const theme = cookieStore.get('theme')?.value
  const isDark = theme === 'dark'

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${inter.variable} ${jetBrainsMono.variable} ${poppins.variable} h-full antialiased${isDark ? ' dark' : ''}`}
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
