'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Share, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * `beforeinstallprompt` isn't in the standard DOM lib types — it's a
 * Chromium-only event. We type just the bits we use.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * The early-capture script in the root layout stashes the event here, since it
 * fires before React mounts. We read it on mount and clear it after use.
 */
declare global {
  interface Window {
    __bip?: BeforeInstallPromptEvent | null
  }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes installed state via this non-standard flag.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/**
 * "Instalar app" button shown in the header.
 *
 * Chromium browsers fire `beforeinstallprompt`, which we capture to drive a
 * native install dialog on click. iOS Safari has no such event, so we detect
 * it and show short "Adicionar à Tela de Início" instructions instead.
 *
 * Renders nothing when the app is already installed (standalone) or when the
 * platform offers no install path at all.
 */
export function InstallButton() {
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const [canPrompt, setCanPrompt] = useState(false)
  const [installed, setInstalled] = useState(true) // assume installed to avoid flash; corrected on mount
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    setInstalled(isStandalone())
    setIos(isIos())

    // The event may have already fired (before this component mounted) and been
    // stashed by the early-capture script in the layout — pick it up now.
    if (window.__bip) {
      promptRef.current = window.__bip
      setCanPrompt(true)
    }

    const onBeforeInstall = (e: Event) => {
      // Stop Chrome's mini-infobar so we can trigger the prompt from our button.
      e.preventDefault()
      promptRef.current = e as BeforeInstallPromptEvent
      setCanPrompt(true)
    }

    // Fired by the early-capture script when it stashes a late event.
    const onBipReady = () => {
      if (window.__bip) {
        promptRef.current = window.__bip
        setCanPrompt(true)
      }
    }

    const onInstalled = () => {
      setInstalled(true)
      setCanPrompt(false)
      promptRef.current = null
      window.__bip = null
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('bipready', onBipReady)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('bipready', onBipReady)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function handleInstall() {
    const evt = promptRef.current
    if (!evt) return
    await evt.prompt()
    const { outcome } = await evt.userChoice
    // The event can only be used once; drop it either way.
    promptRef.current = null
    window.__bip = null
    setCanPrompt(false)
    if (outcome === 'accepted') setInstalled(true)
  }

  if (installed) return null

  // Chromium path — native install dialog.
  if (canPrompt) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleInstall}
        className="border-primary/20 text-primary/80 hover:bg-primary/5 hover:text-blue-800"
      >
        <Download className="h-4 w-4 sm:mr-1.5" />
        <span className="hidden sm:inline">Instalar app</span>
      </Button>
    )
  }

  // iOS path — no programmatic prompt; show manual instructions.
  if (ios) {
    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowIosHelp((v) => !v)}
          className="border-primary/20 text-primary/80 hover:bg-primary/5 hover:text-blue-800"
        >
          <Download className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Instalar app</span>
        </Button>

        {showIosHelp && (
          <div
            role="dialog"
            aria-label="Como instalar no iPhone"
            className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-xl shadow-slate-900/10 z-50"
          >
            <button
              type="button"
              onClick={() => setShowIosHelp(false)}
              aria-label="Fechar"
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="font-semibold text-slate-900 mb-2">Instalar no iPhone/iPad</p>
            <ol className="space-y-2 text-slate-600">
              <li className="flex items-center gap-2">
                <span className="font-medium text-slate-900">1.</span>
                Toque em <Share className="h-4 w-4 inline text-primary" aria-label="Compartilhar" />
                <span>(Compartilhar)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="font-medium text-slate-900">2.</span>
                Escolha <Plus className="h-4 w-4 inline text-primary" aria-hidden />
                <span>&ldquo;Adicionar à Tela de Início&rdquo;</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-slate-900">3.</span>
                <span>Confirme em &ldquo;Adicionar&rdquo;.</span>
              </li>
            </ol>
          </div>
        )}
      </div>
    )
  }

  // No install path available (e.g. desktop Firefox) — render nothing.
  return null
}
