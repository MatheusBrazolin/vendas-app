import { z } from 'zod'

export const saleItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1, 'Quantidade mínima é 1'),
})

export const saleSchema = z.object({
  payment_method: z.enum(['cash', 'credit', 'debit', 'pix'], {
    error: 'Selecione o método de pagamento',
  }),
  notes: z.string().max(500).optional().or(z.literal('')),
  items: z.array(saleItemSchema).min(1, 'Adicione pelo menos um produto'),
})

export type SaleFormData = z.infer<typeof saleSchema>
