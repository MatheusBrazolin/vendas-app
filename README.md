<div align="center">

<img src="public/icon-192.png" alt="VendasApp" width="96" height="96" />

# VendasApp

**Sistema de gestão de vendas e PDV instalável como PWA, construído com Next.js 16 + Supabase.**

[![Live demo](https://img.shields.io/badge/live-vendas--app--topaz.vercel.app-2563eb?style=flat-square)](https://vendas-app-topaz.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

</div>

---

PDV de balcão para pequenos comércios: leitor USB de código de barras, baixa automática de estoque, cálculo de troco, cadastro de produtos via APIs de barcode públicas com cache permanente, controle de papéis (admin × funcionário) e instalação como Progressive Web App em qualquer máquina ou celular.

## ✨ Funcionalidades

- **PDV (Ponto de Venda)** com leitor USB, busca inteligente por nome ou código, carrinho com ajuste de quantidade, métodos de pagamento (Dinheiro, PIX, Crédito, Débito) e **calculadora de troco** automática quando o pagamento é em dinheiro.
- **Cadastro de produtos** com auto-preenchimento via código de barras: ao escanear um EAN/UPC, busca nome e descrição em [Cosmos (Bluesoft)](https://cosmos.bluesoft.com.br/), [Open Food Facts](https://world.openfoodfacts.org/) e [UPCitemdb](https://www.upcitemdb.com/) — com **cache permanente** que garante que cada código consome no máximo uma consulta de API na vida toda.
- **Controle de papéis** via tabela `user_roles`: `admin` (acesso total ao Dashboard, Produtos, Categorias, Usuários, cancelamento de vendas) e `employee` (acesso apenas ao PDV e Histórico de Vendas).
- **Cancelamento de venda** restrito a admins, com restauração atômica de estoque via função Postgres.
- **Baixa automática de estoque** ao confirmar a venda, com bloqueio se o estoque ficar negativo.
- **Dashboard** com KPIs, gráfico de vendas, top produtos, últimas vendas e alerta de produtos com estoque baixo.
- **PWA instalável** — manifesto + Service Worker permitem instalar o app no PC ou celular com ícone próprio, abertura em janela standalone e atalho na área de trabalho. (Fase 1; offline reads e writes nas próximas fases.)
- **Autenticação** via Supabase Auth (email + senha) com **RLS** habilitado em todas as tabelas de escrita e middleware Next.js validando sessão server-side.
- **Layout responsivo** com sidebar fixa no desktop e drawer hambúrguer no mobile.

## 🛠️ Stack

| Camada | Tecnologia |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Server Components, Server Actions, Turbopack) |
| Linguagem | TypeScript |
| UI | [Base UI](https://base-ui.com/) + Tailwind CSS v4 |
| Banco e Auth | [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS), região `sa-east-1` (São Paulo) |
| Hospedagem | [Vercel](https://vercel.com) (Hobby), funções em `gru1` (São Paulo) |
| Validação | [Zod](https://zod.dev/) v4 |
| Formulários | React Hook Form |
| Gráficos | Recharts |
| Toasts | Sonner |
| Ícones | Lucide React |
| PWA | Manifest API do Next.js + Service Worker próprio em `public/sw.js` |

## 🚀 Rodando localmente

### Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com/) (free tier funciona; crie o projeto em **South America (São Paulo)** para latência baixa)
- Opcional: token gratuito do [Cosmos Bluesoft](https://cosmos.bluesoft.com.br/) para lookup de produtos brasileiros

### Setup

```bash
git clone https://github.com/MatheusBrazolin/vendas-app.git
cd vendas-app
npm install
cp .env.example .env.local      # edite com seus valores
npm run dev                     # http://localhost:3000
```

### Variáveis de ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://seuprojeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
COSMOS_API_TOKEN=               # opcional
```

### Migrations do banco

No painel do Supabase, abra o **SQL Editor** e execute na ordem cronológica (prefixo do nome do arquivo):

```
supabase/migrations/
├── 001_initial_schema.sql              tabelas core + RPC create_sale_with_items
├── 20260525000000_barcode_cache.sql    cache de lookups de barcode
├── 20260526000000_user_roles.sql       roles admin/employee + trigger de signup
├── 20260527000000_profiles.sql         nomes/avatar dos usuários
└── 20260528000000_cancel_sale.sql      RPC de cancelamento atômico
```

## 🌐 Deploy

O app está em produção em **[vendas-app-topaz.vercel.app](https://vendas-app-topaz.vercel.app)**. A configuração da Vercel está em [`vercel.json`](vercel.json) — funções serverless rodam em `gru1` (São Paulo) para manter latência baixa quando combinado com Supabase em `sa-east-1`.

Para deployar a sua própria cópia:

1. Fork o repo
2. `vercel.com/new` → import → selecione seu fork
3. Em **Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## 💻 App Desktop (Windows)

Além do acesso pelo navegador (que o dono usa no **celular** para acompanhar as
vendas), há um **app instalável para Windows** — ideal para o caixa/PDV ter um
funcionamento fixo que continua operando se a internet cair.

É um shell Electron ([`electron/main.cjs`](electron/main.cjs)) que abre a versão
publicada numa janela própria. Como o Electron embute o Chromium, o **service
worker e o cache offline** (IndexedDB) funcionam igual ao Chrome: após o primeiro
acesso online (necessário para logar e cachear), o app continua funcionando sem
internet, com as vendas enfileiradas localmente e sincronizadas ao reconectar.

```bash
# Rodar o app desktop em modo dev (abre uma janela; aponta para produção)
npm run desktop

# Apontar para um servidor local durante o desenvolvimento
# (PowerShell)  $env:VENDAS_APP_URL="http://localhost:3000"; npm run desktop

# Gerar o instalador → pasta instalador/VendasApp-Instalador.exe
npm run desktop:build
```

O `npm run desktop:build` cria a pasta **`instalador/`** na raiz do projeto. É ali
que fica o arquivo de instalação: **`instalador/VendasApp-Instalador.exe`**.
Esse `.exe` é autocontido — copie-o para qualquer PC Windows e dê duplo-clique para
instalar (não precisa de Node nem nada). A pasta `instalador/` é ignorada pelo git.

### Disponibilizar o download no site (admin)

Há uma página **admin** em **`/configuracoes/baixar`** (no menu "Administração")
com o botão de baixar — visível só para administradores e oculta dentro do próprio
app desktop. Ela aponta para o instalador hospedado no **GitHub Releases**:

1. Gere o `.exe` (`npm run desktop:build`).
2. No GitHub, crie um **Release** no repo e suba `instalador/VendasApp-Instalador.exe`
   como *asset* (mantenha exatamente esse nome).
3. Pronto — o botão usa a URL estável de "último release":
   `…/releases/latest/download/VendasApp-Instalador.exe`. A cada novo release com o
   mesmo nome de arquivo, o botão passa a baixar a versão nova sem mexer no código.

Para hospedar o `.exe` em outro lugar, defina `NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL`.

> **Login offline:** a autenticação é do Supabase e exige rede. O cenário coberto é
> "estava logado e a internet caiu" — aí tudo continua funcionando. Um *cold start*
> totalmente offline (app fechado + sem rede + sessão expirada) exigiria login, que
> não funciona sem conexão.

> **Build no Windows — erro de symlink:** o `electron-builder` extrai a ferramenta
> `winCodeSign`, que contém symlinks de macOS e falha sem privilégio
> (`Cannot create symbolic link`). Soluções: ativar o **Modo de Desenvolvedor** do
> Windows *(Configurações → Privacidade e segurança → Para desenvolvedores)* **ou**
> rodar o terminal como **Administrador**, e então `npm run desktop:build`. O
> instalador gerado é **não-assinado** (o SmartScreen mostra um aviso na 1ª execução
> → "Mais informações" → "Executar assim mesmo").

## 📂 Estrutura

```
src/
├── app/
│   ├── (auth)/             /login e /cadastro
│   ├── (dashboard)/        área autenticada
│   │   ├── dashboard/      KPIs e visão geral (admin)
│   │   ├── produtos/       CRUD de produtos e categorias (admin)
│   │   ├── vendas/         PDV em /nova, histórico, detalhe, cancelamento
│   │   ├── configuracoes/  gestão de usuários (admin)
│   │   └── layout.tsx
│   ├── manifest.ts         PWA manifest
│   └── layout.tsx          root, fontes, toaster, registro do SW
├── components/
│   ├── dashboard/          widgets de KPI/gráfico/alertas
│   ├── layout/             sidebar (desktop + mobile drawer), header, breadcrumb
│   ├── products/           formulário com auto-preenchimento por barcode
│   ├── sales/              busca de produto no PDV, carrinho, cancelar venda
│   ├── pwa/                SW register, botão instalar, indicador offline,
│   │                        sync provider, badge de vendas pendentes
│   └── ui/                 primitivos de UI (Base UI)
├── hooks/                  React hooks (use-debounce)
├── lib/
│   ├── auth/roles.ts       getCurrentUser, requireAdmin, etc.
│   ├── barcode/lookup.ts   Cosmos → Open Food Facts → UPCitemdb + cache
│   ├── offline/            cache IndexedDB (Dexie), sync, fila de vendas offline
│   ├── queries/            consultas tipadas ao Supabase
│   ├── supabase/           clients de server/client/middleware
│   ├── utils/              format, display, receipt
│   └── validations/        schemas Zod
└── types/database.ts       tipos gerados a partir do schema
electron/
├── main.cjs                shell desktop (Windows) que abre o app publicado
└── icon.png                ícone do instalador
public/
├── icon-*.png              ícones do PWA (gerados por scripts/generate-pwa-icons.mjs)
├── sw.js                   Service Worker
└── icon-source.svg         SVG-fonte dos ícones
scripts/
└── generate-pwa-icons.mjs  gera os PNGs do PWA a partir do SVG-fonte
```

## 🧠 Cache de código de barras

```
[1] Já está em products?              → toast "Já cadastrado"
       ↓ não
[2] Já está em barcode_cache?         → reusa, ZERO consultas externas
       ↓ não
[3] Cosmos → Open Food Facts → UPCitemdb
       ↓
[4] Grava em barcode_cache            → próxima vez é instantânea
```

## 🔐 Segurança

- `.env.local` e `.claude/settings.local.json` no `.gitignore` — segredos e configs por-máquina nunca sobem.
- **RLS habilitado** em `products`, `categories`, `sales`, `sale_items`, `user_roles`, `profiles`, `barcode_cache`.
- Páginas autenticadas usam `requireUser()` / `requireAdmin()` no server, antes de qualquer render.
- Cancelamento de venda é admin-only no Node **e** na função Postgres (defense in depth — a RPC levanta 42501 se `is_admin()` for falso).
- Headers do Service Worker pinados em `next.config.ts` (`Content-Type` correto + `no-cache` para garantir propagação de versões novas).

## 🗺️ Roadmap

- [x] PDV com carrinho, métodos de pagamento, validação de campos obrigatórios e calculadora de troco
- [x] Cancelamento de venda admin-only com restauração atômica de estoque
- [x] Sidebar responsiva (drawer no mobile)
- [x] **PWA Fase 1** — instalável no Chrome/Edge/Safari + botão "Instalar app"
- [x] **PWA Fase 2** — cache de produtos em IndexedDB, leitura offline no PDV
- [x] **PWA Fase 3** — fila de vendas offline + replay idempotente + conflito de estoque
- [x] **App desktop Windows** — instalável (.exe) via Electron, com offline
- [ ] Emissão de NFC-e via serviço terceirizado
- [ ] Relatórios exportáveis (CSV/PDF)
- [ ] Login offline (sessão em cache) para *cold start* sem internet

## 📜 Licença

[MIT](LICENSE)
