# Vercel Instance Isolation & Stale Data

## Problema
Cada requisição a um App Router ou Function no Vercel pode cair em **instâncias serverless diferentes**, cada uma com seu próprio `/tmp`. Isso faz com que dados salvos via `data-store.json` (em `/tmp`) **não sejam compartilhados** entre instâncias.

Uma requisição `POST /api/state/sync` atualiza apenas a instância que a processou. A próxima requisição `GET /api/state` pode cair em outra instância com dados antigos, ressuscitando comandas deletadas, notificações, etc.

## Soluções Implementadas

### 1. Supabase como fonte única da verdade
O `GET /api/state` chama `pullFromSupabase()` antes de responder. Se o Supabase estiver configurado (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`), ele **sempre substitui** o `db` local pelos dados vindos do Supabase. Isso garante que todas as instâncias vejam o mesmo estado.

### 2. Deletar registros no Supabase ao syncar
O `POST /api/state/sync` antigo fazia apenas `Object.assign(db, req.body)` e `syncToSupabase()` — que só faz `upsert` (não deleta). Quando passávamos `{comandas: []}`, o upsert não executava (array vazio), e o Supabase mantinha os registros antigos.

**Correção:** antes de sobrescrever `db`, salvamos os IDs antigos. Depois do `Object.assign`, comparamos os IDs antigos com os novos e **deletamos do Supabase** os que sumiram.

```typescript
const oldComandaIds = (db.comandas || []).map((c: any) => c.id);
Object.assign(db, req.body);
// Deleta do Supabase os IDs que não estão mais no db
const removedIds = oldComandaIds.filter(id => !db.comandas.some(c => c.id === id));
if (removedIds.length > 0)
  await supabase.from('comandas').delete().in('id', removedIds);
```

### 3. Trust server quando servidor está vazio (página carregando)
Quando o servidor retorna `comandas: []` (foi limpo propositalmente via CLI/backend), o cliente não deve sobrescrever com dados velhos do localStorage.

**Lógica no `App.tsx:430`:**
```
se server.comandas.length === 0 && localStorage tem comandas com versão →
  limpa localStorage, confia no servidor
senão se localStorage tem versão mais recente →
  confia no localStorage (proteção contra instância isolada com dado velho)
senão se server tem comandas →
  confia no servidor
```

### 4. Cooldown + Guard + Version cross-tab (já existia)
- `comandaCooldownUntilRef`: 3s de cooldown após POST local
- `comandaVersionRef` + `salesflow_comanda_version` no localStorage: versão compartilhada entre abas
- `isStale` detection: se servidor devolve comanda com mais itens que a local, pula (dado pré-exclusão)
- `comandaSyncGuardRef`: trava durante POST, libera no `.finally()`

## O que NÃO funciona no Vercel
- `/tmp` é **por instância** — não serve como shared state
- `data-store.json` em `/tmp` não é replicado entre instâncias
- Sem Supabase (ou outro DB externo), cada instância tem seu próprio "mundo"

## Comandos úteis

```bash
# Ver estado atual do servidor
curl -s https://salesflow-pi.vercel.app/api/state | python3 -m json.tool

# Limpar dados via sync
curl -s -X POST https://salesflow-pi.vercel.app/api/state/sync \
  -H "Content-Type: application/json" \
  -d '{"comandas":[],"notifications":[],"stockMovements":[]}'

# Deploy manual (se auto-deploy falhar)
npx vercel deploy --prod --token=$VERCEL_TOKEN

# Ver env vars do projeto Vercel
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v1/projects/{projectId}/env"

# SQL direto no Supabase via Management API
curl -s -X POST "https://api.supabase.com/v1/projects/{ref}/database/query" \
  -H "Authorization: Bearer $SUPABASE_PAT" \
  -H "Content-Type: application/json" \
  -d '{"query":"DELETE FROM comandas; DELETE FROM notifications; DELETE FROM stock_movements;"}'
```
