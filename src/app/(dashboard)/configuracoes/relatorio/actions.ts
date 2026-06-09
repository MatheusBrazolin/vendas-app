'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isInternalEmail } from '@/lib/supabase/service'
import { isAdmin } from '@/lib/auth/roles'
import { reportRecipientSchema } from '@/lib/validations/report-recipient.schema'

export interface ActionResult {
  success?: boolean
  error?: string
}

const PATH = '/configuracoes/relatorio'

export async function addReportRecipient(formData: {
  email: string
}): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return { error: 'Apenas administradores podem gerenciar destinatários.' }
  }

  const parsed = reportRecipientSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { email } = parsed.data
  if (isInternalEmail(email)) {
    return { error: 'Use um email real — usuários internos não recebem email.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('report_recipients').insert({ email })

  if (error) {
    if (error.code === '23505' || error.message.toLowerCase().includes('unique')) {
      return { error: 'Esse email já está na lista.' }
    }
    return { error: error.message }
  }

  revalidatePath(PATH)
  return { success: true }
}

export async function setReportRecipientActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return { error: 'Apenas administradores podem gerenciar destinatários.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('report_recipients')
    .update({ active })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(PATH)
  return { success: true }
}

export async function deleteReportRecipient(id: string): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return { error: 'Apenas administradores podem gerenciar destinatários.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('report_recipients').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(PATH)
  return { success: true }
}
