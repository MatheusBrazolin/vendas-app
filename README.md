# VendasApp

Sistema de gestão de vendas para pequenos comércios, construído com **Next.js 16** e **Supabase**. Foi desenhado para rodar como PDV de balcão: leitor de código de barras USB, baixa automática de estoque, consulta a bases públicas de produtos (Cosmos / Open Food Facts / UPCitemdb) com cache permanente.

> Site público, área administrativa protegida por login. Catálogo e relatórios são abertos a qualquer visitante; criar, editar e vender exigem autenticação.

---

## ✨ Funcionalidades

- **Dashboard** com indicadores de venda, top produtos e últimas vendas
- **Catálogo de produtos** com categorias, preço de venda/custo, estoque atual e mínimo
- **PDV** (Ponto de Venda) com leitor de código de barras USB, carrinho e múltiplos métodos de pagamento (Dinheiro, PIX, Crédito, Débito)
- **Auto-preenchimento por código de barras**: ao escanear um EAN/UPC, o sistema busca nome e descrição em
  - **Cosmos (Bluesoft)** — base brasileira (precisa de API key gratuita)
  - **Open Food Facts** — alimentos e cosméticos, sem chave
  - **UPCitemdb** — produtos internacionais, sem chave
- **Cache permanente de lookups** em tabela própria do Supabase — cada código gasta no máximo uma consulta de API na vida toda
- **Baixa automática de estoque** ao finalizar venda, com bloqueio quando o estoque é insuficiente
- **Autenticação** via Supabase Auth (e-mail + senha)
- **RLS (Row Level Security)** em todas as tabelas de escrita

---

## 🛠️ Stack

| Camada | Tecnologia |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Server Components, Server Actions) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com/) |
| Banco e Auth | [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS) |
| Validação | [Zod](https://zod.dev/) v4 |
| Formulários | React Hook Form |
| Gráficos | Recharts |
| Toasts | Sonner |
| Ícones | Lucide React |

---

## 🚀 Como rodar localmente

### 1. Pré-requisitos

- Node.js 20+
- Uma conta no [Supabase](https://supabase.com/) (free tier funciona)
- Opcional: conta no [Cosmos Bluesoft](https://cosmos.bluesoft.com.br/) para lookups de produtos brasileiros

### 2. Clone e instale

```bash
git clone <url-do-repo>
cd vendas-app
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` com seus valores:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seuprojeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Opcional: token gratuito em https://cosmos.bluesoft.com.br
COSMOS_API_TOKEN=
```

### 4. Aplique o schema no Supabase

No painel do seu projeto Supabase, abra o **SQL Editor** e execute, na ordem:

1. `supabase/migrations/001_initial_schema.sql` — tabelas `categories`, `products`, `sales`, `sale_items` + RPC `create_sale_with_items`
2. `supabase/migrations/20260525000000_barcode_cache.sql` — tabela `barcode_cache` para o cache de lookups

### 5. Rode o servidor

```bash
npm run dev
```

Abra http://localhost:3000

---

## 📂 Estrutura do projeto

```
src/
├── app/
│   ├── (auth)/             # /login e /cadastro (públicas)
│   ├── (dashboard)/        # área principal
│   │   ├── dashboard/      # indicadores e visão geral
│   │   ├── produtos/       # CRUD de produtos + categorias
│   │   └── vendas/         # listagem, detalhe e PDV (/vendas/nova)
│   └── globals.css
├── components/
│   ├── dashboard/          # widgets do dashboard
│   ├── layout/             # header, sidebar, etc.
│   ├── products/           # formulário e ações de produto
│   ├── sales/              # carrinho e busca de produto no PDV
│   └── ui/                 # primitivos shadcn/ui
├── lib/
│   ├── barcode/lookup.ts   # Cosmos → Open Food Facts → UPCitemdb
│   ├── supabase/           # clients server, client e middleware
│   ├── utils/              # helpers de format, debounce, etc.
│   └── validations/        # schemas Zod
└── types/database.ts       # tipos do schema Supabase
```

---

## 🧠 Fluxo do cache de código de barras

Ao escanear ou digitar um código no cadastro de produto:

```
[1] Já está nos produtos cadastrados?    → toast "Já cadastrado"
       ↓ não
[2] Já consultei esse código antes?      → reusa cache, ZERO consultas externas
       ↓ não
[3] Cosmos (BR) → Open Food Facts → UPCitemdb
       ↓
[4] Grava o resultado em barcode_cache   → próxima vez é instantâneo e grátis
```

Cada código consome **no máximo uma consulta de API na vida toda**, independentemente de quantas vezes for escaneado.

---

## 🔐 Segurança

- `.env.local` está no `.gitignore` — segredos nunca vão para o repositório
- **RLS habilitado** em todas as tabelas de escrita
- Páginas de criação/edição/deleção protegidas com `supabase.auth.getUser()` no servidor
- Middleware do Supabase apenas redireciona usuários **autenticados** que tentem acessar `/login` ou `/cadastro` (visitantes podem navegar livremente pelo catálogo público)

---

## 📜 Licença

[MIT](LICENSE)
