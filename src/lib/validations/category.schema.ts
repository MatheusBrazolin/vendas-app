import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().min(2, 'Nome obrigatório').max(100, 'Nome muito longo'),
})

export type CategoryFormData = z.infer<typeof categorySchema>
