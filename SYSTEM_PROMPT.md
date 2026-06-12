# SalesFlow — Documento do Sistema

## 1. Visão Geral

SalesFlow é um sistema de gestão de comandas (tickets) e PDV (ponto de venda) para o Grupo FRZ. Opera como SPA React com backend serverless Express em Vercel, com persistência em arquivo JSON e sincronização opcional com Supabase (PostgreSQL).

**Stack atual:** React 19 + TypeScript + Vite 6 + Tailwind CSS 4 (modo dark) + Express 4 + Vercel serverless + Supabase (opcional).

**Deploy:** `https://salesflow-pi.vercel.app`

---

## 2. Arquitetura

```
Navegador (React SPA)
    │
    ├── fetch('/api/*') ──────► api/index.ts (Vercel Lambda)
    │                              │
    │                              ├── data-store.json (/tmp)
    │                              └── Supabase (opcional)
    │
    ├── localStorage ───────────► Cache local + cross-tab sync
    │
    └── Supabase client ───────► Direto (auth, realtime subscriptions)
```

**Fluxo de dados (prioridade):**
1. Ação do usuário → React state update (otimista)
2. localStorage persist
3. POST /api/* (servidor Express)
4. data-store.json (arquivo)
5. [opcional] syncToSupabase() (PostgreSQL)

---

## 3. Estrutura de Arquivos

```
SalesFlow/
├── api/
│   └── index.ts              # Serverless Express (Vercel Lambda) — todos os endpoints
├── src/
│   ├── App.tsx               # Componente raiz — estado global, polling, sync, layout
│   ├── main.tsx              # Entry point React
│   ├── types.ts              # Interfaces TypeScript (Product, Comanda, etc.)
│   ├── initialData.ts        # Arrays vazios de inicialização + meses
│   ├── index.css             # Tailwind + tokens CSS FRZ (@theme)
│   ├── components/
│   │   ├── AccessManagement.tsx       # CRUD de usuários + controle de acesso
│   │   ├── ClientMobileView.tsx       # View do cliente/smartphone
│   │   ├── ComandaDetailView.tsx      # Detalhe expandido de comanda
│   │   ├── ComandaList.tsx            # Lista/tabela de comandas
│   │   ├── ComandaPOSView.tsx         # POS com comandas em grelha (não usado atualmente)
│   │   ├── DirectPOSView.tsx          # PDV de venda direta (sem comanda)
│   │   ├── FluxoDashboard.tsx         # Dashboard financeiro com filtros
│   │   ├── InviteActivation.tsx       # Ativação de convite de usuário
│   │   ├── QRCodeGenerator.tsx        # Gerador de QR code para comandas
│   │   ├── SignaturePad.tsx           # Componente de assinatura digital
│   │   ├── StockManagement.tsx        # Gestão de estoque/produtos
│   │   ├── UnitManagementModal.tsx    # Modal de gestão de unidades
│   │   └── WhatsAppAuthSandbox.tsx    # Sandbox de autenticação WhatsApp
│   └── lib/
│       ├── supabase.ts         # Cliente Supabase (frontend)
│       └── supabaseSync.ts     # Funções de sync: push, pull, subscribe realtime
├── server.ts                # Servidor Express standalone (dev + produção local)
├── vite.config.ts           # Config Vite
├── vercel.json              # Rotas, builds Vercel
├── .env                     # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── supabase-schema.sql      # Schema SQL das tabelas Supabase
```

---

## 4. Modelos de Dados (TypeScript → Supabase)

### Product
```typescript
interface Product {
  id: string;
  code: string;       // Código único do produto
  name: string;
  price: number;
  stock: number;
  category: string;
  image?: string;     // Base64 data-URL
}
```
Tabela Supabase: `products` (PK: id, unique: code)

### Comanda (Ticket)
```typescript
interface Comanda {
  id: string;                // Ex: "COM-7593"
  clientName: string;
  clientType: 'Aluno' | 'Colaborador' | 'Diretoria';
  clientEmail?: string;
  clientPhone?: string;
  courseOrTraining: string;  // Curso/treinamento do cliente
  month: string;             // Mês em português
  status: 'Pendente' | 'Pago';
  createdAt: string;         // ISO date
  closedAt?: string;
  items: OrderedItem[];
  unit?: string;             // Unidade operacional
  closureReminderActive?: boolean;
}
```
Tabela Supabase: `comandas` (PK: id, items: JSONB)

### OrderedItem
```typescript
interface OrderedItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  price: number;
  quantity: number;
  timestamp: string;
  signature?: string;   // Base64 da assinatura digital
  signedAt?: string;
}
```

### StockMovement
```typescript
interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  type: 'entrada' | 'saida' | 'ajuste';
  quantity: number;
  price: number;
  totalValue: number;
  reference: string;
  timestamp: string;
}
```
Tabela Supabase: `stock_movements`

### SystemUser (auth local, sem server-side)
```typescript
interface SystemUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier';
  status: 'active' | 'invited';
  password?: string;
  invitationCode?: string;
  needsPasswordChange?: boolean;
  createdAt: string;
}
```

### UserSession
```typescript
interface UserSession {
  id?: string;
  username: string;
  loginName: string;
  role: 'admin' | 'cashier';
  email?: string;
}
```
Persistida em `localStorage` como `salesflow_session`.

### CashierShift
```typescript
interface CashierShift {
  id: string;
  openedAt: string;
  openedBy: string;
  closedAt?: string;
  closedBy?: string;
  initialBalance: number;
  finalBalance?: number;
  actualCashInHand?: number;
  notes?: string;
  isActive: boolean;
}
```
Usado via Supabase diretamente, sem endpoint no backend Express.

### Notification
```typescript
// Sem type explícito — objeto dinâmico com:
interface Notification {
  id: string;
  timestamp: string;
  recipient: string;
  course: string;
  contact: string;
  type: string;
  message: string;
  status: string;
  sender?: string;
}
```

### Enumerações
```typescript
type ClientType = 'Aluno' | 'Colaborador' | 'Diretoria';
type PaymentStatus = 'Pendente' | 'Pago';
type ThemeType = 'slate' | 'emerald' | 'midnight' | 'gold-dark';
```

---

## 5. Backend (API Express — `/api/index.ts`)

### 5.1 Persistência

Arquivo JSON em `/tmp/data-store.json` (Vercel) ou `data-store.json` (local).

**Estado em memória (`db`):**
```typescript
{
  products: Product[],
  comandas: Comanda[],
  notifications: Notification[],
  stockMovements: StockMovement[],
  categories: string[],        // Padrão: Bebidas, Alimentos, Papelaria, Vestuário, Acessórios
  unidades: string[],           // Padrão: Sede Principal, Filial Norte, Filial Sul
  whatsStatus: 'disconnected' | 'connecting' | 'connected',
  whatsNumber: string
}
```

### 5.2 Endpoints

| Método | Rota | Descrição | Sync Supabase |
|--------|------|-----------|:---:|
| GET | `/api/state` | Retorna estado completo do db | Sim (pull) |
| POST | `/api/state/sync` | Atualiza seletivamente o db | Sim |
| POST | `/api/products` | Cria/atualiza 1 produto | Sim |
| DELETE | `/api/products/:id` | Remove produto | Sim |
| POST | `/api/products/bulk` | Substitui array inteiro de produtos | Sim |
| POST | `/api/comandas` | Cria/atualiza 1 comanda | Sim |
| DELETE | `/api/comandas/:id` | Remove comanda | Sim |
| POST | `/api/comandas/bulk` | Substitui array inteiro de comandas | Sim |
| POST | `/api/notifications` | Adiciona notificação (max 50) | Sim |
| GET | `/api/stock-movements` | Lista movimentações (filtro por data) | Não |
| POST | `/api/stock-movements` | Adiciona movimentação (max 1000) | Sim |
| POST | `/api/reset` | Factory reset (limpa tudo) | Sim |
| POST | `/api/whatsapp/config` | Atualiza número WhatsApp | Não |
| POST | `/api/whatsapp/send-comanda-link` | Envia link de comanda via WhatsApp | Não |
| POST | `/api/whatsapp/send-comanda-update` | Envia atualização via WhatsApp | Não |
| POST | `/api/whatsapp/connect` | Simula conexão WhatsApp (4.5s delay) | Não |
| POST | `/api/whatsapp/force-connect` | Conexão instantânea | Não |
| POST | `/api/whatsapp/disconnect` | Desconecta WhatsApp | Não |

### 5.3 Sanitização

Comandas geradas automaticamente são removidas em toda escrita/leitura:
- `clientName === 'Cliente QR Especial'`
- `clientName` startsWith `'Cliente Smartphone '`
- `courseOrTraining === 'Área do Aluno Elite'`
- `courseOrTraining === 'Treinamento de Auto-Atendimento'`
- `clientName === 'Venda Balcão' && course === 'PDV'`

### 5.4 Supabase Sync (Opcional)

A sincronização com Supabase depende das env vars `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

**`syncToSupabase()`** — upsert em 6 tabelas:
- `categories` (onConflict: name)
- `unidades` (onConflict: name)
- `products` (onConflict: id)
- `comandas` (onConflict: id)
- `stock_movements` (onConflict: id)
- `notifications` (onConflict: id)

**`pullFromSupabase()`** — lê as mesmas 6 tabelas, sobrescreve `db` local, chamado em todo GET /api/state e na inicialização se `db.products` estiver vazio.

---

## 6. Frontend (React)

### 6.1 Estado Global (App.tsx)

Gerenciado via `useState` + `useRef` no componente App, passado como props para subcomponentes.

**Estados principais:**
- `products: Product[]` — sincronizado com localStorage `salesflow_products_v2`
- `comandas: Comanda[]` — sincronizado com localStorage `salesflow_tickets_v2`
- `notifications: Notification[]` — sincronizado com localStorage `salesflow_notifications`
- `stockMovements: StockMovement[]`
- `categories: string[]` — sincronizado com localStorage `salesflow_categories`
- `unidades: string[]` — sincronizado com localStorage `salesflow_unidades`
- `session: UserSession | null` — localStorage `salesflow_session`
- `users: SystemUser[]` — localStorage `salesflow_users_v2`
- `activeShift: CashierShift | null`
- `shiftHistory: CashierShift[]`
- `clientActiveComandaId: string | null`
- `viewMode: 'both' | 'admin' | 'client'`
- `activeAdminSubTab: string` (sidebar navigation)
- `whatsConnectionStatus: string`
- `systemWhatsNumber: string`
- `theme: ThemeType` — `'gold-dark'` força dark mode
- `brandLogoOption: 'quantum' | 'shield' | 'infinite'`

**Refs (para evitar stale closure em callbacks):**
- `productsRef`, `comandasRef`, `notificationsRef`
- `comandaSyncGuardRef: boolean` — impede polling de sobrescrever comandas durante POST

### 6.2 Armazenamento Local (localStorage)

Chaves utilizadas:
- `salesflow_products_v2` → Product[]
- `salesflow_tickets_v2` → Comanda[]
- `salesflow_notifications` → Notification[]
- `salesflow_categories` → string[]
- `salesflow_unidades` → string[]
- `salesflow_session` → UserSession
- `salesflow_users_v2` → SystemUser[]
- `salesflow_active_shift` → CashierShift
- `salesflow_shift_history` → CashierShift[]
- `salesflow_client_active_id_v2` → string (comanda ID)
- `salesflow_brand_logo_v5` → string
- `salesflow_system_whats_number` → string
- `salesflow_whats_status` → string

### 6.3 Sincronização entre Abas

**Evento `storage` do navegador:**
Ouvinte em `App.tsx` detecta mudanças em qualquer chave do localStorage feitas por outras abas e atualiza o estado React automaticamente.

**Polling (3s ou 10s):**
```typescript
useEffect(() => {
  const intervalMs = isSupabaseConfigured() ? 10000 : 3000;
  const interval = setInterval(async () => {
    const res = await fetch('/api/state');
    applyRemoteState(await res.json());
  }, intervalMs);
  return () => clearInterval(interval);
}, [isInitialized]);
```

**`applyRemoteState()`** — atualiza do servidor:
- Comandas: só se `comandaSyncGuardRef` estiver `false` (guarda ativo durante POST local)
- Notifications, whatsStatus, whatsNumber: sempre

**Guarda de sincronização (`comandaSyncGuardRef`):**
Ativado antes de `POST /api/comandas/bulk`, desativado no `.finally()`.
Isola a atualização local do polling para evitar race condition entre abas.

**Supabase Realtime (quando configurado):**
```typescript
subscribeToSupabaseRealtime(() => {
  // debounce 400ms então fetch('/api/state') + applyRemoteState()
});
```

### 6.4 Salvamento de Dados

**`saveComandasToStorage(updatedComandas: Comanda[])`:**
1. `sanitizeComandas()` — remove comandas geradas automaticamente
2. `setComandas(clean)` + `localStorage.setItem(...)`
3. `comandaSyncGuardRef.current = true`
4. `POST /api/comandas/bulk` (fire-and-forget)
5. `.finally()` → `comandaSyncGuardRef.current = false`

**`saveProductsToStorage(updatedProducts: Product[])`:**
1. `setProducts(updated)` + `localStorage.setItem(...)`
2. `POST /api/products/bulk` (fire-and-forget)

**`recordStockMovement(movement: StockMovement)`:**
1. `setStockMovements(prev => [movement, ...prev].slice(0, 1000))`
2. `POST /api/stock-movements` (fire-and-forget)

### 6.5 Inicialização (on mount)

1. Ler todos os dados do localStorage
2. `fetch('/api/state')` — obter estado do servidor
3. Se servidor tem dados: usar server `products` e `comandas`
4. Se servidor vazio e cliente tem dados: `POST /api/state/sync` com dados locais (backup)
5. Se URL tem `?comanda=ID`: ativar modo cliente
6. `setIsInitialized(true)` — inicia polling

### 6.6 Login / Autenticação

**Local, sem server-side.** Usuários e senhas armazenados no estado React + localStorage.

**Usuários padrão:**
- `admin` / `123` (role: admin)
- `caixa` / `123` (role: cashier)

**Fluxo:**
1. Formulário de login → match `username` + `password` no array `users`
2. Verifica `status === 'active'` e `needsPasswordChange === false`
3. Cria `UserSession` e persiste em `localStorage`
4. Logout: remove `localStorage` item

**Controle de Acesso (admin):**
- Sidebar mostra "Administração" → "Controle de Acessos" apenas se `session.role === 'admin'`
- CRUD de usuários: criar, convidar, ativar, desativar, resetar senha

---

## 7. Componentes

### 7.1 DirectPOSView
PDV de venda direta (sem comanda). Três colunas:
- Foto do produto (aparece ao digitar código/nome)
- Formulário: código/nome + quantidade + valor + total
- Cupom não fiscal ao lado
- Botão Finalizar → baixa estoque, registra movimentação, emite comprovante
- Botão Imprimir → `window.open` → `print()` → `close()`

### 7.2 ComandaDetailView
Detalhe expandido de comanda: lista de itens com quantidades, preços, totais, assinatura digital, status, timeline, ações (adicionar item, remover, fechar, reabrir, enviar WhatsApp).

### 7.3 ClientMobileView
View do cliente (smartphone). Exibe comanda, itens, total. Permite adicionar produtos do cardápio e assinar digitalmente itens.

### 7.4 ComandaList
Tabela de comandas com filtros, pesquisa, status.

### 7.5 StockManagement
CRUD de produtos: código, nome, preço, estoque, categoria, imagem (base64). Upload via `<input type="file">` com conversão para base64.

### 7.6 FluxoDashboard
Dashboard financeiro:
- Filtro por intervalo de datas
- 5 cards: Total de Vendas, Total de Custos, Lucro Bruto, Total de Itens Vendidos, Valor em Estoque
- Tabela de vendas detalhadas (comanda, itens, valores)
- Tabela de movimentações de estoque
- Exportação CSV e PDF

### 7.7 AccessManagement
CRUD de usuários: criar, convidar (gera código + link para ativação), ativar, desativar, resetar senha. Botão "Zerar Sistema" (factory reset).

### 7.8 InviteActivation
Tela de ativação de convite: usuário digita código de convite + define senha.

### 7.9 WhatsAppAuthSandbox
Painel de controle WhatsApp: número configurado, status (conectado/desconectado), botões Conectar, Desconectar, Forçar Conexão.

### 7.10 UnitManagementModal
Modal de gestão de unidades: CRUD de unidades operacionais.

### 7.11 QRCodeGenerator
Gerador de QR code para acesso público a comanda via smartphone.

### 7.12 SignaturePad
Componente de assinatura digital (canvas + eventos de mouse/touch).

### 7.13 ComandaPOSView
POS em grelha com cards de comandas. Atualmente não usado (substituído por ComandaDetailView).

---

## 8. Layout e Design System FRZ Group

**Cores:**
- Accent: `#1876D2` (`frz-primary`)
- Hover: `#1565C0` (`frz-primary-hover`)
- Fundo: `#09090B` a `#1E293B` (slate escuro)
- Texto: branco/cinza claro

**Tokens no `@theme` (Tailwind v4):**
```css
:root {
  --color-frz-primary: #1876D2;
  --color-frz-primary-hover: #1565C0;
}
```

**Estilos principais:**
- `min-h-screen flex flex-col`
- Cards: `bg-slate-900/80 border border-slate-800 rounded-2xl/3xl`
- Inputs: `bg-slate-800 border-slate-700 rounded-xl`
- Botões: gradiente FRZ ou outline slate
- Sidebar: colapsável, logo ao clicar expande/recolhe

---

## 9. Integração WhatsApp (Evolution API)

**Instância configurada:** `frz-compras` (55 91 99385-0763) via Evolution API local (`http://localhost:8080`)

**Env vars:**
```
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=frz-local-evolution-api-key
EVOLUTION_INSTANCE_NAME=frz-compras
```

**Endpoint Evolution chamado:**
```
POST {baseUrl}/message/sendText/{instanceName}
Headers: apikey, Content-Type: application/json
Body: { number, text }
```

**Mensagens enviadas:**
1. **Link de acesso** — quando comanda é criada
2. **Atualização** — quando itens são adicionados/modificados
3. **Fechamento** — quando comanda é paga/fechada
4. **Lembrete** — lembrete para solicitar fechamento no caixa

**Fallback:** Se Evolution falha, retorna URL manual `https://api.whatsapp.com/send?phone=...`

**Conexão WhatsApp:** Simulada (não há QR code real). Endpoint `/connect` espera 4.5s e muda status para `'connected'`.

---

## 10. Deploy

### Vercel (produção)

**URL:** `https://salesflow-pi.vercel.app`

**vercel.json:**
```json
{
  "version": 2,
  "cleanUrls": true,
  "builds": [
    { "src": "package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } },
    { "src": "api/**/*.ts", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/assets/(.*)", "dest": "/assets/$1", "headers": { "cache-control": "public, max-age=31536000, immutable" } },
    { "src": "/api/(.*)", "dest": "api/index.ts" },
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

**Build:** `vite build` (React SPA) + `esbuild server.ts` (Express standalone)

**Env vars (Vercel):**
- `VITE_SUPABASE_URL` — `https://zmfkburkuxvlgzfpjngh.supabase.co`
- `VITE_SUPABASE_ANON_KEY` — anon key
- `EVOLUTION_API_URL` — `http://localhost:8080`
- `EVOLUTION_API_KEY` — `frz-local-evolution-api-key`
- `EVOLUTION_INSTANCE_NAME` — `frz-compras`

### Local (desenvolvimento)

```bash
npm run dev    # tsx server.ts — Express + Vite middleware
npm run build  # vite build + esbuild
npm run start  # node dist/server.cjs
```

---

## 11. Supabase (Opcional — para sync entre instâncias)

**Projeto:** `zmfkburkuxvlgzfpjngh` — apenas IPv6

**Tabelas (8):**
`categories`, `unidades`, `products`, `comandas`, `notifications`, `stock_movements`, `system_users`, `cashier_shifts`

**RLS:** Todas as tabelas têm política pública: `for all using (true) with check (true)`

**Sync server-side:** `syncToSupabase()` upsert após cada mutação; `pullFromSupabase()` em cada GET /api/state

**Sync frontend:** `pushDataToSupabase()` (export manual), `pullStateFromSupabase()` (import manual), `subscribeToSupabaseRealtime()` (subscription PostgreSQL)

---

## 12. URLs e Links

- **Produção:** https://salesflow-pi.vercel.app
- **GitHub:** https://github.com/AfonsoAlves1985/SalesFlow
- **Supabase:** https://supabase.com/dashboard/project/zmfkburkuxvlgzfpjngh
- **Vercel:** projeto `salesflow`, team `afonsoalves1985s-projects`
- **Túnel cloudflared:** systemd rodando na máquina local, auto-update Vercel env
- **Evolution API:** `http://localhost:8080` (Docker, bind `127.0.0.1:8080:8080`)

---

## 13. Comandos Úteis

```bash
# Dev
npm run dev

# Build
npm run build

# Deploy Vercel
npx vercel deploy --prod --token <token> --force

# TypeScript check
npx tsc --noEmit

# Deploy túnel WSL → cloudflared
curl -s https://api.github.com/repos/cloudflare/cloudflared/releases/latest | grep browser_download_url | grep linux_amd64 | cut -d '"' -f 4
sudo cloudflared tunnel --url http://localhost:3000

# WSL sudo password
2907
```
