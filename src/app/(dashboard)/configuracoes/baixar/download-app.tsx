'use client'

import { useEffect, useState } from 'react'
import { Download, MonitorDown, Check, ShieldAlert, WifiOff } from 'lucide-react'

/**
 * Direct link to the latest Windows installer. Defaults to the GitHub
 * "latest release" download URL (stable because the artifact name is fixed —
 * see `build.artifactName` in package.json). Override per-environment with
 * NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL if the binary is hosted elsewhere.
 */
const DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL ||
  'https://github.com/MatheusBrazolin/vendas-app/releases/latest/download/VendasApp-Instalador.exe'

export function DownloadApp() {
  // Don't offer the download when the page is already open inside the desktop
  // app — there's nothing to install from there. Detected client-side via the
  // Electron user-agent, so we start hidden-safe and reveal after mount.
  const [inDesktopApp, setInDesktopApp] = useState(false)

  useEffect(() => {
    setInDesktopApp(/electron/i.test(navigator.userAgent))
  }, [])

  if (inDesktopApp) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <Check className="h-4 w-4" />
        Você já está usando o aplicativo desktop.
      </div>
    )
  }

  return (
    <a
      href={DOWNLOAD_URL}
      rel="noopener"
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-900/10 hover:bg-blue-700 active:bg-blue-800 transition-colors"
    >
      <Download className="h-4.5 w-4.5" />
      Baixar para Windows
    </a>
  )
}

/** Static cards explaining how to install and what to expect. Server-safe. */
export function DownloadInfo() {
  const steps = [
    {
      icon: MonitorDown,
      title: 'Instale no computador do caixa',
      body: 'Abra o arquivo baixado e siga o instalador. Cria um atalho na área de trabalho.',
    },
    {
      icon: ShieldAlert,
      title: 'Aviso do Windows (normal)',
      body: 'O instalador não é assinado. Se aparecer o SmartScreen, clique em "Mais informações" → "Executar assim mesmo".',
    },
    {
      icon: WifiOff,
      title: 'Funciona sem internet',
      body: 'Após o primeiro acesso online (para logar), o app continua vendendo se a conexão cair — as vendas sincronizam ao reconectar.',
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {steps.map((s) => (
        <div
          key={s.title}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <s.icon className="h-5 w-5 text-blue-600" />
          <p className="mt-2 text-sm font-semibold text-slate-900">{s.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{s.body}</p>
        </div>
      ))}
    </div>
  )
}
