'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

/**
 * Where to send a user right after authenticating, based on their role.
 * Admins go to the dashboard with full KPIs; employees go straight to the PDV.
 */
async function postLoginPath(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return '/login'

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  return roleRow?.role === 'admin' ? '/dashboard' : '/vendas/nova'
}

export async function signIn(usernameOrEmail: string, password: string) {
  const supabase = await createClient()

  // If the input has no "@", treat it as a username → map to internal email.
  // Admin accounts with real emails still work by typing their full email.
  const email = usernameOrEmail.includes('@')
    ? usernameOrEmail.trim()
    : `${usernameOrEmail.toLowerCase().trim()}@vendas-app.interno`

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Usuário ou senha inválidos.' }
  }

  revalidatePath('/', 'layout')
  redirect(await postLoginPath())
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function forgotPassword(email: string) {
  const supabase = await createClient()
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = (headersList.get('x-forwarded-proto') ?? 'http').split(',')[0].trim()
  const redirectTo = `${proto}://${host}/redefinir-senha`

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) return { error: 'Não foi possível enviar o email. Tente novamente.' }
  return { success: true }
}
