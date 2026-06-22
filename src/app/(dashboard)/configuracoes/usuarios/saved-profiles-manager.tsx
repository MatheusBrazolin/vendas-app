'use client'

import { useState, useEffect } from 'react'
import { MonitorSmartphone, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import {
  getRecentProfiles,
  removeProfile,
  getInitials,
  getAvatarGradient,
  type RecentProfile,
} from '@/lib/utils/recent-profiles'

export function SavedProfilesManager() {
  const [profiles, setProfiles] = useState<RecentProfile[]>([])

  useEffect(() => {
    setProfiles(getRecentProfiles())
  }, [])

  function handleRemove(username: string) {
    removeProfile(username)
    setProfiles(getRecentProfiles())
  }

  return (
    <Card className="border-slate-200/80 shadow-sm overflow-hidden dark:border-slate-700/60">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center gap-2">
        <MonitorSmartphone className="h-4 w-4 text-slate-400 dark:text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Perfis salvos na tela de login
        </h2>
        <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">este dispositivo</span>
      </div>

      <div className="p-5">
        {profiles.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
            Nenhum perfil salvo neste dispositivo.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {profiles.map((profile) => (
              <div
                key={profile.username}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60"
              >
                <div
                  className={`h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br ${getAvatarGradient(profile.username)} flex items-center justify-center text-white text-xs font-bold shadow-sm`}
                >
                  {getInitials(profile.username)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                    {profile.username}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {new Date(profile.lastLogin).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(profile.username)}
                  className="ml-1 h-6 w-6 rounded-full hover:bg-red-100 hover:text-red-600 text-slate-400 dark:text-slate-500 dark:hover:bg-red-900/40 dark:hover:text-red-400 flex items-center justify-center transition-colors"
                  aria-label={`Remover ${profile.username}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500">
          Estes perfis aparecem na tela de login para acesso rápido. Cada dispositivo mantém sua própria lista.
        </p>
      </div>
    </Card>
  )
}
