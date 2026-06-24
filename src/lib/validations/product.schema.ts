import { z } from 'zod'

export const productSchema = z.object({
  code: z.string().min(1, 'Código obrigatório').max(50, 'Código muito longo'),
  name: z.string().min(2, 'Nome obrigatório').max(200, 'Nome muito longo'),
  description: z.string().max(500, 'Descrição muito longa').optional().or(z.literal('')),
  sale_price: z.coerce
    .number({ error: 'Preço inválido' })
    .min(0, 'Preço não pode ser negativo'),
  cost_price: z.coerce
    .number({ error: 'Custo inválido' })
    .min(0, 'Custo não pode ser negativo'),
  stock_quantity: z.coerce
    .number({ error: 'Estoque inválido' })
    .int('Estoque deve ser inteiro')
    .min(0, 'Estoque não pode ser negativo'),
  min_stock: z.coerce
    .number({ error: 'Estoque mínimo inválido' })
    .int('Estoque mínimo deve ser inteiro')
    .min(0, 'Estoque mínimo não pode ser negativo'),
  category_id: z.string().uuid('Categoria inválida').optional().or(z.literal('')).nullable(),
  track_stock: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return true
      return val === 'true' || val === true
    },
    z.boolean()
  ),
})

export type ProductFormData = z.infer<typeof productSchema>
