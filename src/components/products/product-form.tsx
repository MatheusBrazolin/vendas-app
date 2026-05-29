'use client'

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save, X, ScanBarcode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { productSchema, type ProductFormData } from '@/lib/validations/product.schema'
import { lookupProductByBarcode } from '@/app/(dashboard)/produtos/actions'
import type { Category, Product } from '@/types/database'

const SOURCE_LABELS: Record<string, string> = {
  cosmos: 'Cosmos (Bluesoft)',
  openfoodfacts: 'Open Food Facts',
  upcitemdb: 'UPCitemdb',
}

interface ProductFormProps {
  product?: Product
  categories: Category[]
  onSubmit: (formData: FormData) => Promise<{ error?: string } | undefined>
}

export function ProductForm({ product, categories, onSubmit }: ProductFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isLookingUp, setIsLookingUp] = useState(false)
  const router = useRouter()
  const isNew = !product

  const nameInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
    defaultValues: product
      ? {
          code: product.code,
          name: product.name,
          description: product.description ?? '',
          sale_price: product.sale_price,
          cost_price: product.cost_price,
          stock_quantity: product.stock_quantity,
          min_stock: product.min_stock,
          category_id: product.category_id ?? '',
        }
      : { stock_quantity: 0, min_stock: 0, cost_price: 0, sale_price: 0 },
  })

  // Resolve refs by composing react-hook-form's ref with our local refs.
  // We must call register() once per field and capture the result.
  const codeRegister = register('code')
  const nameRegister = register('name')
  const codeInputRef = useRef<HTMLInputElement | null>(null)

  // Auto-focus the code field on mount so the USB scanner targets it directly
  useEffect(() => {
    if (isNew) {
      codeInputRef.current?.focus()
    }
  }, [isNew])

  /**
   * Heuristic: real barcodes (EAN-8, EAN-13, UPC-A, etc.) are 8+ purely numeric digits.
   * Anything else is treated as a custom internal SKU and skipped to avoid wasted API calls.
   */
  function looksLikeBarcode(code: string): boolean {
    return /^\d{8,14}$/.test(code)
  }

  /**
   * Try to enrich the form using the scanned/typed code.
   * - If already in own DB → toast + offer to open the existing product.
   * - If found via Cosmos / Open Food Facts → pre-fill name & description.
   * - If not found → focus next field so the user can fill manually.
   */
  async function runBarcodeLookup(code: string) {
    const trimmed = code.trim()
    if (!trimmed || !isNew) {
      nameInputRef.current?.focus()
      return
    }

    // For custom SKUs (e.g. "EX-001") we still check duplicates but skip external APIs
    const isBarcode = looksLikeBarcode(trimmed)

    setIsLookingUp(true)
    try {
      const result = await lookupProductByBarcode(trimmed)

      if (result.status === 'already_registered') {
        toast.warning(`Já cadastrado: ${result.name}`, {
          action: {
            label: 'Abrir',
            onClick: () => router.push(`/produtos/${result.productId}`),
          },
        })
        return
      }

      if (result.status === 'found_external') {
        setValue('name', result.name, { shouldValidate: true })
        if (result.description) {
          setValue('description', result.description, { shouldValidate: true })
        }
        const label = SOURCE_LABELS[result.source] ?? result.source
        toast.success(`Produto encontrado em ${label}`)
        nameInputRef.current?.focus()
        nameInputRef.current?.select()
        return
      }

      if (result.status === 'error') {
        toast.error(result.message)
        nameInputRef.current?.focus()
        return
      }

      // not_found — only show "not found" toast for actual barcodes; for SKUs the user
      // is expected to type the name manually.
      if (isBarcode) {
        toast.info('Código não encontrado. Preencha os dados manualmente.')
      }
      nameInputRef.current?.focus()
    } finally {
      setIsLookingUp(false)
    }
  }

  // USB scanners send Enter after the code. Block accidental form submit
  // and trigger the lookup → pre-fill flow.
  function handleCodeKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void runBarcodeLookup(e.currentTarget.value)
    }
  }

  function handleCodeBlur(e: FocusEvent<HTMLInputElement>) {
    // Also trigger lookup when the user tabs out (typed the code manually)
    if (isNew && e.currentTarget.value.trim()) {
      void runBarcodeLookup(e.currentTarget.value)
    }
  }

  function handleFormSubmit(data: ProductFormData) {
    startTransition(async () => {
      const formData = new FormData()
      Object.entries(data).forEach(([k, v]) => {
        if (v !== null && v !== undefined) formData.set(k, String(v))
      })

      const result = await onSubmit(formData)
      if (result?.error) {
        toast.error(result.error)
      }
    })
  }

  return (
    <Card className="max-w-2xl border-slate-200/80 shadow-sm">
      <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3">
        <CardTitle className="text-sm font-semibold text-slate-900">
          {product ? 'Dados do produto' : 'Informações do produto'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <ScanBarcode className="h-3.5 w-3.5 text-slate-500" />
                Código <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="code"
                  placeholder="EX-001 ou aponte o leitor"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  aria-invalid={!!errors.code}
                  className="h-10 border-slate-200 pr-9"
                  {...codeRegister}
                  ref={(el) => {
                    codeRegister.ref(el)
                    codeInputRef.current = el
                  }}
                  onKeyDown={handleCodeKeyDown}
                  onBlur={(e) => {
                    codeRegister.onBlur(e)
                    handleCodeBlur(e)
                  }}
                  disabled={isLookingUp}
                />
                {isLookingUp ? (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
                ) : (
                  <ScanBarcode className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                )}
              </div>
              {isNew && (
                <p className="text-[11px] text-slate-400">
                  Ao escanear ou pressionar Enter, buscamos nome e descrição automaticamente.
                </p>
              )}
              {errors.code && (
                <p className="text-red-500 text-xs">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-slate-700">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Nome do produto"
                required
                aria-invalid={!!errors.name}
                className="h-10 border-slate-200"
                {...nameRegister}
                ref={(el) => {
                  nameRegister.ref(el)
                  nameInputRef.current = el
                }}
              />
              {errors.name && (
                <p className="text-red-500 text-xs">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-medium text-slate-700">
              Descrição
            </Label>
            <Input
              id="description"
              placeholder="Descrição opcional"
              className="h-10 border-slate-200"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-red-500 text-xs">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sale_price" className="text-xs font-medium text-slate-700">
                Preço de Venda (R$) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="sale_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                required
                aria-invalid={!!errors.sale_price}
                className="h-10 border-slate-200"
                {...register('sale_price')}
              />
              {errors.sale_price && (
                <p className="text-red-500 text-xs">{errors.sale_price.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cost_price" className="text-xs font-medium text-slate-700">
                Preço de Custo (R$) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                required
                aria-invalid={!!errors.cost_price}
                className="h-10 border-slate-200"
                {...register('cost_price')}
              />
              {errors.cost_price && (
                <p className="text-red-500 text-xs">{errors.cost_price.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="stock_quantity" className="text-xs font-medium text-slate-700">
                Estoque Atual <span className="text-red-500">*</span>
              </Label>
              <Input
                id="stock_quantity"
                type="number"
                min="0"
                placeholder="0"
                required
                aria-invalid={!!errors.stock_quantity}
                className="h-10 border-slate-200"
                {...register('stock_quantity')}
              />
              {errors.stock_quantity && (
                <p className="text-red-500 text-xs">{errors.stock_quantity.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="min_stock" className="text-xs font-medium text-slate-700">
                Estoque Mínimo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="min_stock"
                type="number"
                min="0"
                placeholder="0"
                required
                aria-invalid={!!errors.min_stock}
                className="h-10 border-slate-200"
                {...register('min_stock')}
              />
              {errors.min_stock && (
                <p className="text-red-500 text-xs">{errors.min_stock.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Categoria</Label>
            <Select
              defaultValue={product?.category_id ?? ''}
              onValueChange={(v) => setValue('category_id', v)}
            >
              <SelectTrigger className="h-10 border-slate-200">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem categoria</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {product ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
              onClick={() => router.back()}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
