import { z } from 'zod'

export const reportRecipientSchema = z.object({
  email: z
    .string()
    .min(1, 'Informe um email')
    .email('Email inválido')
    .max(254, 'Email muito longo')
    .trim()
    .toLowerCase(),
})

export type ReportRecipientFormData = z.infer<typeof reportRecipientSchema>
