import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const isVercel = process.env.VERCEL === '1';
const DB_FILE = isVercel
  ? path.join('/tmp', 'data-store.json')
  : path.join(process.cwd(), 'data-store.json');
const DEFAULT_SCOPE = { companyId: 'grupo-frz', workspaceId: 'febracis-pa', spaceId: 'caixa-principal' };

function withDefaultScope(item: any) {
  return { ...DEFAULT_SCOPE, ...(item || {}) };
}

function sameScope(a: any, b: any) {
  return (a?.companyId || DEFAULT_SCOPE.companyId) === (b?.companyId || DEFAULT_SCOPE.companyId)
    && (a?.workspaceId || DEFAULT_SCOPE.workspaceId) === (b?.workspaceId || DEFAULT_SCOPE.workspaceId)
    && (a?.spaceId || DEFAULT_SCOPE.spaceId) === (b?.spaceId || DEFAULT_SCOPE.spaceId);
}

function getScopeKey(scope: any) {
  return `${scope?.companyId || DEFAULT_SCOPE.companyId}:${scope?.workspaceId || DEFAULT_SCOPE.workspaceId}:${scope?.spaceId || DEFAULT_SCOPE.spaceId}`;
}

function isGeneratedModelComanda(c: any) {
  const name = String(c?.clientName || '').trim();
  const course = String(c?.courseOrTraining || '').trim();
  return name === 'Cliente QR Especial'
    || name.startsWith('Cliente Smartphone ')
    || course === 'Área do Aluno Elite'
    || course === 'Treinamento de Auto-Atendimento'
    || (name === 'Venda Balcão' && course === 'PDV');
}

function sanitizeState(state: any) {
  const catsByScope = state?.categoriesByScope || {};
  const unitsByScope = state?.unidadesByScope || {};
  if (!state?.categoriesByScope && Array.isArray(state?.categories)) {
    catsByScope[getScopeKey(DEFAULT_SCOPE)] = state.categories;
  }
  if (!state?.unidadesByScope && Array.isArray(state?.unidades)) {
    unitsByScope[getScopeKey(DEFAULT_SCOPE)] = state.unidades;
  }
  return {
    ...state,
    categoriesByScope: catsByScope,
    unidadesByScope: unitsByScope,
    products: Array.isArray(state?.products) ? state.products.map(withDefaultScope) : [],
    stockMovements: Array.isArray(state?.stockMovements) ? state.stockMovements.map(withDefaultScope) : [],
    notifications: Array.isArray(state?.notifications) ? state.notifications.map(withDefaultScope) : [],
    auditLogs: Array.isArray(state?.auditLogs) ? state.auditLogs.slice(0, 500) : [],
    receivables: Array.isArray(state?.receivables) ? state.receivables.map(withDefaultScope) : [],
    comandas: Array.isArray(state?.comandas)
      ? state.comandas.filter((c: any) => !isGeneratedModelComanda(c))
        .map(withDefaultScope)
      : []
  };
}

function normalizeWhatsAppNumber(phone: string) {
  let cleanPhone = String(phone || '').replace(/\D/g, '');
  if (cleanPhone && cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
    cleanPhone = `55${cleanPhone}`;
  }
  return cleanPhone;
}

function getPublicOrigin(req: any) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'salesflow-pi.vercel.app';
  return `${proto}://${host}`;
}

function getComandaAccessMessage(comanda: any, accessUrl: string) {
  return `*SalesFlow - Acesso à Comanda*\n\nOlá, *${comanda.clientName || 'Cliente'}*!\n\nSua comanda digital foi aberta com sucesso.\n\n*Código:* ${comanda.id}\n*Unidade:* ${comanda.unit || 'Sede Principal'}\n*Referência:* ${comanda.courseOrTraining || 'Atendimento'}\n*Status:* ${comanda.status || 'Pendente'}\n\nAcesse pelo link abaixo para acompanhar seu consumo, conferir itens lançados e assinar digitalmente seus pedidos:\n${accessUrl}\n\nApresente esta comanda no caixa para fechamento e pagamento.`;
}

function buildItemsList(items: any[]) {
  if (!items || items.length === 0) return '* Nenhum item adicionado ainda.';
  return items.map((i: any) => `* ${i.quantity}x ${i.productName} - R$ ${(Number(i.price || 0) * Number(i.quantity || 0)).toFixed(2)}`).join('\n');
}

function getComandaTotal(items: any[]) {
  return (items || []).reduce((sum: number, i: any) => sum + (Number(i.price || 0) * Number(i.quantity || 0)), 0);
}

function getComandaUpdateMessage(comanda: any, accessUrl: string, updateType: 'update' | 'close' | 'reminder') {
  const itemsList = buildItemsList(comanda.items);
  const total = getComandaTotal(comanda.items);
  const statusEmoji = comanda.status === 'Pago' ? '✅ PAGO / FECHADO' : '⏳ PENDENTE / EM ABERTO';

  if (updateType === 'close') {
    return `*SalesFlow - Comanda Fechada* ✅\n\nOlá, *${comanda.clientName || 'Cliente'}*!\nSua comanda (*${comanda.id}*) foi fechada com sucesso!\n\n📍 *Unidade:* ${comanda.unit || 'Sede Principal'}\n📚 *Treinamento / Categoria:* ${comanda.courseOrTraining || 'Atendimento'}\n📅 *Status:* ${statusEmoji}\n\n🛒 *RESUMO DO CONSUMO:*\n${itemsList}\n\n💰 *TOTAL:* R$ ${total.toFixed(2)}\n\nObrigado pela preferência!\n\n_SalesFlow - Sistema Automático de Notificação_`;
  }

  const base = `*SalesFlow - Atualização de Comanda* 🛎️\n\nOlá, *${comanda.clientName || 'Cliente'}*!\nSeguem os detalhes atualizados da sua comanda (*${comanda.id}*):\n\n📍 *Unidade:* ${comanda.unit || 'Sede Principal'}\n📚 *Treinamento / Categoria:* ${comanda.courseOrTraining || 'Atendimento'}\n📅 *Status Atual:* ${statusEmoji}\n\n🛒 *RESUMO DO CONSUMO:*\n${itemsList}\n\n💰 *TOTAL ACUMULADO:* R$ ${total.toFixed(2)}\n\n🔗 Acompanhe em tempo real, adicione itens e assine digitalmente:\n${accessUrl}`;

  if (updateType === 'reminder') {
    return `${base}\n\n🗣 *Solicite o fechamento da sua comanda no caixa para finalizar seu atendimento!*`;
  }

  return `${base}\n\n_SalesFlow - Sistema Automático de Notificação_`;
}

function getManualWhatsAppUrl(phone: string, message: string) {
  const number = normalizeWhatsAppNumber(phone);
  return number
    ? `https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

async function sendEvolutionText(number: string, text: string) {
  const baseUrl = (process.env.EVOLUTION_API_URL || process.env.EVOLUTION_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
  const apiKey = process.env.EVOLUTION_API_KEY || '';
  const instance = process.env.EVOLUTION_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE || 'salesflow';

  if (!baseUrl || !instance) {
    return { success: false, error: 'Evolution não configurado no ambiente do servidor.' };
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers.apikey = apiKey;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(instance)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ number, text }),
      signal: controller.signal
    });
  } catch (e: any) {
    const error = e?.name === 'AbortError'
      ? 'Timeout ao conectar na Evolution. Verifique se o túnel público está ativo e atualizado na Vercel.'
      : (e?.message || 'Falha de rede ao conectar na Evolution.');
    return { success: false, error };
  } finally {
    clearTimeout(timeout);
  }

  const raw = await response.text();
  let data: any = raw;
  try { data = JSON.parse(raw); } catch {}

  if (!response.ok) {
    return { success: false, error: typeof data === 'string' ? data : data?.message || 'Falha ao enviar pela Evolution.' };
  }

  return { success: true, data };
}

async function checkEvolutionHealth() {
  const baseUrl = (process.env.EVOLUTION_API_URL || process.env.EVOLUTION_BASE_URL || '').replace(/\/$/, '');
  const apiKey = process.env.EVOLUTION_API_KEY || '';
  const instance = process.env.EVOLUTION_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE || '';
  const configured = !!baseUrl && !!instance;

  if (!configured) {
    return { configured, ok: false, error: 'Evolution não configurado no ambiente.' };
  }

  const headers: Record<string, string> = {};
  if (apiKey) headers.apikey = apiKey;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${baseUrl}/instance/connectionState/${encodeURIComponent(instance)}`, {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    const raw = await response.text();
    let data: any = raw;
    try { data = JSON.parse(raw); } catch {}
    return {
      configured,
      ok: response.ok,
      status: response.status,
      instance,
      urlHost: (() => { try { return new URL(baseUrl).host; } catch { return 'invalid-url'; } })(),
      data
    };
  } catch (e: any) {
    return {
      configured,
      ok: false,
      instance,
      urlHost: (() => { try { return new URL(baseUrl).host; } catch { return 'invalid-url'; } })(),
      error: e?.name === 'AbortError'
        ? 'Timeout ao acessar Evolution. Túnel provavelmente indisponível.'
        : (e?.message || 'Falha de rede ao acessar Evolution.')
    };
  } finally {
    clearTimeout(timeout);
  }
}

// --- Supabase integration ---
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
let supabase: any = null;
const REALTIME_SIGNAL_ID = 'global';

async function initSupabase() {
  if (!supabaseUrl || !supabaseKey) return;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e: any) {
    console.error('[SalesFlow] Failed to init Supabase:', e?.message);
  }
}

async function pullFromSupabase(defaults: any, light = false) {
  if (!supabase) return null;
  try {
    const defaultProducts = Array.isArray(defaults?.products) ? defaults.products : [];
    const [cats, units, prods, coms, notifs, stockMovs] = await Promise.all([
      supabase.from('categories').select('name,company_id,workspace_id,space_id'),
      supabase.from('unidades').select('name,company_id,workspace_id,space_id'),
      supabase.from('products').select(light ? 'id,code,name,price,stock,category,updated_at' : '*'),
      supabase.from('comandas').select('*').order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').order('timestamp', { ascending: false }).limit(50),
      supabase.from('stock_movements').select('*').order('timestamp', { ascending: false }).limit(200),
    ]);
    const mappedComandas = (coms.data || []).map((c: any) => ({
      companyId: c.company_id || DEFAULT_SCOPE.companyId,
      workspaceId: c.workspace_id || DEFAULT_SCOPE.workspaceId,
      spaceId: c.space_id || DEFAULT_SCOPE.spaceId,
      id: c.id, clientName: c.client_name, clientType: c.client_type,
      clientEmail: c.client_email, clientPhone: c.client_phone,
      courseOrTraining: c.course_or_training, month: c.month, status: c.status,
      createdAt: c.created_at, updatedAt: c.updated_at, closedAt: c.closed_at, unit: c.units,
      closureReminderActive: !!c.closure_reminder_active, items: c.items || []
    }));
    const generatedIds = mappedComandas
      .filter(isGeneratedModelComanda)
      .map((c: any) => c.id)
      .filter(Boolean);
    if (generatedIds.length > 0) {
      await supabase.from('comandas').delete().in('id', generatedIds);
    }
    const catsByScope: Record<string, string[]> = {};
    const unitsByScope: Record<string, string[]> = {};
    for (const c of (cats.data || [])) {
      const sk = getScopeKey({ companyId: c.company_id, workspaceId: c.workspace_id, spaceId: c.space_id });
      if (!catsByScope[sk]) catsByScope[sk] = [];
      catsByScope[sk].push(c.name);
    }
    for (const u of (units.data || [])) {
      const sk = getScopeKey({ companyId: u.company_id, workspaceId: u.workspace_id, spaceId: u.space_id });
      if (!unitsByScope[sk]) unitsByScope[sk] = [];
      unitsByScope[sk].push(u.name);
    }
    if (Object.keys(catsByScope).length === 0) catsByScope[getScopeKey(DEFAULT_SCOPE)] = [];
    if (Object.keys(unitsByScope).length === 0) unitsByScope[getScopeKey(DEFAULT_SCOPE)] = [];
    return sanitizeState({
      ...defaults,
      categoriesByScope: catsByScope,
      unidadesByScope: unitsByScope,
      products: (prods.data || []).map((p: any) => {
        const localProduct = defaultProducts.find((local: any) => local?.id === p.id);
        return {
          companyId: p.company_id || DEFAULT_SCOPE.companyId,
          workspaceId: p.workspace_id || DEFAULT_SCOPE.workspaceId,
          spaceId: p.space_id || DEFAULT_SCOPE.spaceId,
          id: p.id, code: p.code, name: p.name,
          price: Number(p.price) || 0, stock: Number(p.stock) || 0, category: p.category,
          image: light ? localProduct?.image : (p.image || undefined), updatedAt: p.updated_at
        };
      }),
      comandas: mappedComandas,
      notifications: (notifs.data || []).map((n: any) => ({
        companyId: n.company_id || DEFAULT_SCOPE.companyId,
        workspaceId: n.workspace_id || DEFAULT_SCOPE.workspaceId,
        spaceId: n.space_id || DEFAULT_SCOPE.spaceId,
        id: n.id, timestamp: n.timestamp, recipient: n.recipient,
        course: n.course, contact: n.contact, type: n.type,
        message: n.message, status: n.status, sender: n.sender
      })),
      stockMovements: (stockMovs.data || []).map((m: any) => ({
        companyId: m.company_id || DEFAULT_SCOPE.companyId,
        workspaceId: m.workspace_id || DEFAULT_SCOPE.workspaceId,
        spaceId: m.space_id || DEFAULT_SCOPE.spaceId,
        id: m.id, productId: m.product_id, productName: m.product_name,
        productCode: m.product_code, type: m.type, quantity: m.quantity,
        price: Number(m.price) || 0, totalValue: Number(m.total_value) || 0,
        reference: m.reference, timestamp: m.timestamp
      })),
    });
  } catch (e: any) {
    console.error('[SalesFlow] Supabase pull failed:', e?.message);
    return null;
  }
}

async function syncToSupabase() {
  if (!supabase || !db) return;
  try {
    db = sanitizeState(db);
    const upsertTable = async (table: string, key: string, rows: any[]) => {
      if (rows.length > 0) {
        const { error } = await supabase.from(table).upsert(rows, { onConflict: key });
        if (error) throw error;
      }
    };

    const catsByScope = db.categoriesByScope || {};
    const unitsByScope = db.unidadesByScope || {};
    const catRows: any[] = [];
    const unitRows: any[] = [];
    for (const scopeKey of Object.keys(catsByScope)) {
      const [companyId, workspaceId, spaceId] = scopeKey.split(':');
      for (const name of (catsByScope[scopeKey] || [])) {
        catRows.push({ company_id: companyId, workspace_id: workspaceId, space_id: spaceId, name });
      }
    }
    for (const scopeKey of Object.keys(unitsByScope)) {
      const [companyId, workspaceId, spaceId] = scopeKey.split(':');
      for (const name of (unitsByScope[scopeKey] || [])) {
        unitRows.push({ company_id: companyId, workspace_id: workspaceId, space_id: spaceId, name });
      }
    }
    await Promise.all([
      supabase.from('categories').upsert(catRows, { onConflict: 'company_id,workspace_id,space_id,name' }),
      supabase.from('unidades').upsert(unitRows, { onConflict: 'company_id,workspace_id,space_id,name' }),
      upsertTable('products', 'id', db.products.map((p: any) => ({
        company_id: p.companyId || DEFAULT_SCOPE.companyId,
        workspace_id: p.workspaceId || DEFAULT_SCOPE.workspaceId,
        space_id: p.spaceId || DEFAULT_SCOPE.spaceId,
        id: p.id, code: p.code, name: p.name,
        price: Number(p.price) || 0, stock: Number(p.stock) || 0, category: p.category,
        image: p.image || null, updated_at: p.updatedAt || new Date().toISOString()
      }))),
      upsertTable('comandas', 'id', db.comandas.map((c: any) => ({
        company_id: c.companyId || DEFAULT_SCOPE.companyId,
        workspace_id: c.workspaceId || DEFAULT_SCOPE.workspaceId,
        space_id: c.spaceId || DEFAULT_SCOPE.spaceId,
        id: c.id, client_name: c.clientName, client_type: c.clientType,
        client_email: c.clientEmail || null, client_phone: c.clientPhone || null,
        course_or_training: c.courseOrTraining, month: c.month, status: c.status,
        created_at: c.createdAt, updated_at: c.updatedAt || c.closedAt || c.createdAt || new Date().toISOString(), closed_at: c.closedAt || null, units: c.unit || null,
        closure_reminder_active: !!c.closureReminderActive, items: c.items || []
      }))),
      upsertTable('notifications', 'id', db.notifications.map((n: any) => ({
        company_id: n.companyId || DEFAULT_SCOPE.companyId,
        workspace_id: n.workspaceId || DEFAULT_SCOPE.workspaceId,
        space_id: n.spaceId || DEFAULT_SCOPE.spaceId,
        id: n.id, timestamp: n.timestamp, recipient: n.recipient,
        course: n.course, contact: n.contact, type: n.type,
        message: n.message, status: n.status, sender: n.sender || null
      }))),
      upsertTable('stock_movements', 'id', (db.stockMovements || []).map((m: any) => ({
        company_id: m.companyId || DEFAULT_SCOPE.companyId,
        workspace_id: m.workspaceId || DEFAULT_SCOPE.workspaceId,
        space_id: m.spaceId || DEFAULT_SCOPE.spaceId,
        id: m.id, product_id: m.productId, product_name: m.productName,
        product_code: m.productCode, type: m.type, quantity: m.quantity,
        price: Number(m.price) || 0, total_value: Number(m.totalValue) || 0,
        reference: m.reference, timestamp: m.timestamp
      }))),
    ]);
    await bumpRealtimeSignal();
  } catch (e: any) {
    console.error('[SalesFlow] Supabase sync failed:', e?.message);
  }
}

async function bumpRealtimeSignal() {
  if (!supabase) return;
  const now = new Date().toISOString();
  const { error } = await supabase.from('app_state_version').upsert({
    id: REALTIME_SIGNAL_ID,
    version: now,
    updated_at: now
  }, { onConflict: 'id' });
  if (error) {
    console.error('[SalesFlow] Realtime signal update failed:', error.message);
  }
}

async function deleteFromSupabase(table: string, column: string, values: any[]) {
  if (!supabase || values.length === 0) return;
  const { error } = await supabase.from(table).delete().in(column, values);
  if (error) throw error;
}

function comandaTimestamp(c: any) {
  return new Date(c?.updatedAt || c?.closedAt || c?.createdAt || 0).getTime() || 0;
}

function preferNewerComanda(incoming: any, current: any) {
  if (!current) return incoming;
  const incomingTs = comandaTimestamp(incoming);
  const currentTs = comandaTimestamp(current);
  if (incomingTs !== currentTs) return incomingTs > currentTs ? incoming : current;
  if ((incoming.items || []).length !== (current.items || []).length) {
    return (incoming.items || []).length > (current.items || []).length ? incoming : current;
  }
  if (incoming.status === 'Pago' && current.status !== 'Pago') return incoming;
  if (current.status === 'Pago' && incoming.status !== 'Pago') return current;
  return incoming;
}

function mergeComandaLists(incoming: any[], current: any[]) {
  const byId = new Map<string, any>();
  current.forEach(c => c?.id && byId.set(c.id, c));
  incoming.forEach(c => c?.id && byId.set(c.id, preferNewerComanda(c, byId.get(c.id))));
  return incoming.map(c => byId.get(c.id)).filter(Boolean);
}

function productTimestamp(p: any) {
  return new Date(p?.updatedAt || 0).getTime() || 0;
}

function preferNewerProduct(incoming: any, current: any) {
  if (!current) return incoming;
  const incomingTs = productTimestamp(incoming);
  const currentTs = productTimestamp(current);
  if (incomingTs && currentTs && incomingTs !== currentTs) return incomingTs > currentTs ? incoming : current;
  return incoming;
}

function mergeProductLists(incoming: any[], current: any[]) {
  const byId = new Map<string, any>();
  current.forEach(p => p?.id && byId.set(p.id, p));
  incoming.forEach(p => p?.id && byId.set(p.id, preferNewerProduct(p, byId.get(p.id))));
  return incoming.map(p => byId.get(p.id)).filter(Boolean);
}

function mergeAuditLogs(incoming: any[], current: any[]) {
  const byId = new Map<string, any>();
  [...incoming, ...current].forEach(log => log?.id && byId.set(log.id, log));
  return Array.from(byId.values())
    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
    .slice(0, 500);
}

function receivableTimestamp(r: any) {
  return new Date(r?.updatedAt || r?.paidAt || r?.canceledAt || r?.createdAt || 0).getTime() || 0;
}

function mergeReceivables(incoming: any[], current: any[]) {
  const byId = new Map<string, any>();
  current.forEach(r => r?.id && byId.set(r.id, r));
  incoming.forEach(r => {
    if (!r?.id) return;
    const currentItem = byId.get(r.id);
    if (!currentItem || receivableTimestamp(r) >= receivableTimestamp(currentItem)) {
      byId.set(r.id, r);
    }
  });
  return Array.from(byId.values())
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
}

// --- DB persistence ---
function loadDb() {
    const defaults = {
    products: [],
    comandas: [],
    notifications: [],
    stockMovements: [],
    auditLogs: [],
    receivables: [],
    categoriesByScope: { [getScopeKey(DEFAULT_SCOPE)]: ['Bebidas', 'Alimentos', 'Papelaria', 'Vestuário', 'Acessórios'] },
    unidadesByScope: { [getScopeKey(DEFAULT_SCOPE)]: ['Sede Principal', 'Filial Norte', 'Filial Sul'] },
    whatsStatus: 'disconnected',
    whatsNumber: '+55 (11) 99999-9999'
  };
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (data.products) {
        const migrated = { ...defaults, ...data };
        if (!migrated.categoriesByScope && Array.isArray(migrated.categories)) {
          migrated.categoriesByScope = { [getScopeKey(DEFAULT_SCOPE)]: migrated.categories };
        }
        if (!migrated.unidadesByScope && Array.isArray(migrated.unidades)) {
          migrated.unidadesByScope = { [getScopeKey(DEFAULT_SCOPE)]: migrated.unidades };
        }
        return sanitizeState(migrated);
      }
    }
  } catch {}
  return sanitizeState(defaults);
}

function saveDb() {
  try {
    db = sanitizeState(db);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch {}
}

function getScopeFromReq(req: any) {
  return {
    companyId: req.query?.company || DEFAULT_SCOPE.companyId,
    workspaceId: req.query?.workspace || DEFAULT_SCOPE.workspaceId,
    spaceId: req.query?.space || DEFAULT_SCOPE.spaceId
  };
}

function getStateResponse(light: boolean, req?: any) {
  const scope = req ? getScopeFromReq(req) : DEFAULT_SCOPE;
  const sk = getScopeKey(scope);
  const response = !light ? db : {
    ...db,
    products: (db.products || []).map((p: any) => ({
      companyId: p.companyId || DEFAULT_SCOPE.companyId,
      workspaceId: p.workspaceId || DEFAULT_SCOPE.workspaceId,
      spaceId: p.spaceId || DEFAULT_SCOPE.spaceId,
      id: p.id,
      code: p.code,
      name: p.name,
      price: p.price,
      stock: p.stock,
      category: p.category,
      updatedAt: p.updatedAt
    }))
  };
  return {
    ...response,
    categories: (db.categoriesByScope || {})[sk] || [],
    unidades: (db.unidadesByScope || {})[sk] || [],
    __meta: getStateMeta(req)
  };
}

function getStateMeta(req?: any) {
  const scope = req ? getScopeFromReq(req) : DEFAULT_SCOPE;
  const sk = getScopeKey(scope);
  const source = JSON.stringify({
    products: (db.products || []).map((p: any) => [p.companyId, p.workspaceId, p.spaceId, p.id, p.stock, p.price, p.category, p.updatedAt]),
    comandas: (db.comandas || []).map((c: any) => [c.companyId, c.workspaceId, c.spaceId, c.id, c.status, c.updatedAt, c.closedAt, (c.items || []).length]),
    notifications: (db.notifications || []).slice(0, 5).map((n: any) => [n.id, n.timestamp, n.status]),
    stockMovements: (db.stockMovements || []).slice(0, 5).map((m: any) => [m.id, m.timestamp]),
    auditLogs: (db.auditLogs || []).slice(0, 5).map((a: any) => [a.id, a.timestamp, a.action, a.entityType]),
    receivables: (db.receivables || []).map((r: any) => [r.id, r.status, r.amount, r.paidAmount, r.updatedAt]),
    categories: (db.categoriesByScope || {})[sk] || [],
    unidades: (db.unidadesByScope || {})[sk] || [],
    whatsStatus: db.whatsStatus,
    whatsNumber: db.whatsNumber
  });
  return {
    version: crypto.createHash('sha1').update(source).digest('hex'),
    counts: {
      products: db.products?.length || 0,
      comandas: db.comandas?.length || 0,
      notifications: db.notifications?.length || 0,
      stockMovements: db.stockMovements?.length || 0,
      auditLogs: db.auditLogs?.length || 0,
      receivables: db.receivables?.length || 0
    }
  };
}

// --- Express app setup ---
const app = express();
app.use(express.json({ limit: '15mb' }));

app.get('/api/state', async (req: any, res: any) => {
  const light = req.query?.light === '1';
  const pulled = await pullFromSupabase(db, light);
  if (pulled) {
    db = pulled;
    saveDb();
  }
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.json(getStateResponse(light, req));
});

app.get('/api/state/meta', async (req: any, res: any) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.json(getStateMeta(req));
});

app.post('/api/products/images', async (req: any, res: any) => {
  const ids: string[] = Array.isArray(req.body?.ids)
    ? Array.from(new Set<string>(req.body.ids.map((id: any) => String(id || '').trim()).filter(Boolean))).slice(0, 200)
    : [];
  const images: Record<string, string> = {};

  for (const id of ids) {
    const product = (db.products || []).find((p: any) => p?.id === id);
    if (product?.image) images[id] = product.image;
  }

  const missingIds = ids.filter(id => !images[id]);
  if (supabase && missingIds.length > 0) {
    const { data, error } = await supabase.from('products').select('id,image').in('id', missingIds);
    if (!error && Array.isArray(data)) {
      data.forEach((p: any) => {
        if (p?.id && p?.image) {
          images[p.id] = p.image;
          const localProduct = (db.products || []).find((item: any) => item?.id === p.id);
          if (localProduct && !localProduct.image) localProduct.image = p.image;
        }
      });
      saveDb();
    }
  }

  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.json({ success: true, images });
});

app.post('/api/state/sync', async (req: any, res: any) => {
  // Track removed IDs for Supabase deletion
  const oldProductIds = (db.products || []).map((p: any) => p.id);
  const oldComandaIds = (db.comandas || []).map((c: any) => c.id);
  const oldNotificationIds = (db.notifications || []).map((n: any) => n.id);
  const oldStockMovementIds = (db.stockMovements || []).map((m: any) => m.id);
  const sk = req.body?.scopeKey || getScopeKey(DEFAULT_SCOPE);
  const oldCategoryNames = (db.categoriesByScope || {})[sk] || [];
  const oldUnitNames = (db.unidadesByScope || {})[sk] || [];

  const incomingState = { ...req.body };
  if (Array.isArray(incomingState.products)) {
    incomingState.products = mergeProductLists(incomingState.products.map(withDefaultScope), db.products || []);
  }
  if (Array.isArray(incomingState.comandas)) {
    incomingState.comandas = mergeComandaLists(incomingState.comandas.map(withDefaultScope), db.comandas || []);
  }
  if (Array.isArray(incomingState.auditLogs)) {
    incomingState.auditLogs = mergeAuditLogs(incomingState.auditLogs.map(withDefaultScope), db.auditLogs || []);
  }
  if (Array.isArray(incomingState.receivables)) {
    incomingState.receivables = mergeReceivables(incomingState.receivables.map(withDefaultScope), db.receivables || []);
  }
  if (Array.isArray(incomingState.stockMovements)) {
    incomingState.stockMovements = incomingState.stockMovements.map(withDefaultScope);
  }
  if (Array.isArray(incomingState.notifications)) {
    incomingState.notifications = incomingState.notifications.map(withDefaultScope);
  }
  if (Array.isArray(incomingState.categories)) {
    const cats = db.categoriesByScope || {};
    cats[sk] = incomingState.categories;
    incomingState.categoriesByScope = cats;
  }
  if (Array.isArray(incomingState.unidades)) {
    const units = db.unidadesByScope || {};
    units[sk] = incomingState.unidades;
    incomingState.unidadesByScope = units;
  }
  Object.assign(db, incomingState);
  saveDb();

  // Delete removed items from Supabase
  if (supabase) {
    const removedProductIds = oldProductIds.filter((id: string) => !(db.products || []).some((p: any) => p.id === id));
    const removedComandaIds = oldComandaIds.filter((id: string) => !(db.comandas || []).some((c: any) => c.id === id));
    const removedNotificationIds = oldNotificationIds.filter((id: string) => !(db.notifications || []).some((n: any) => n.id === id));
    const removedStockMovementIds = oldStockMovementIds.filter((id: string) => !(db.stockMovements || []).some((m: any) => m.id === id));
    const [scopeCompanyId, scopeWorkspaceId, scopeSpaceId] = sk.split(':');
    const deletePromises: Promise<any>[] = [];
    if (removedProductIds.length > 0) deletePromises.push(supabase.from('products').delete().in('id', removedProductIds));
    if (removedComandaIds.length > 0) deletePromises.push(supabase.from('comandas').delete().in('id', removedComandaIds));
    if (removedNotificationIds.length > 0) deletePromises.push(supabase.from('notifications').delete().in('id', removedNotificationIds));
    if (removedStockMovementIds.length > 0) deletePromises.push(supabase.from('stock_movements').delete().in('id', removedStockMovementIds));
    if (oldCategoryNames.length > 0) {
      deletePromises.push(supabase.from('categories').delete().match({ company_id: scopeCompanyId, workspace_id: scopeWorkspaceId, space_id: scopeSpaceId }).in('name', oldCategoryNames));
    }
    if (oldUnitNames.length > 0) {
      deletePromises.push(supabase.from('unidades').delete().match({ company_id: scopeCompanyId, workspace_id: scopeWorkspaceId, space_id: scopeSpaceId }).in('name', oldUnitNames));
    }
    await Promise.all(deletePromises).catch((e) => console.error('[SalesFlow] Supabase delete failed:', e?.message));
  }

  await syncToSupabase();
  res.json({
    success: true,
    counts: {
      products: db.products?.length || 0,
      comandas: db.comandas?.length || 0,
      notifications: db.notifications?.length || 0,
      stockMovements: db.stockMovements?.length || 0,
      auditLogs: db.auditLogs?.length || 0,
      receivables: db.receivables?.length || 0
    }
  });
});

app.post('/api/audit-logs', async (req: any, res: any) => {
  if (!req.body?.id) return res.status(400).json({ error: 'Missing id' });
  db.auditLogs = mergeAuditLogs([withDefaultScope(req.body)], db.auditLogs || []);
  saveDb();
  await bumpRealtimeSignal();
  res.json({ success: true, count: db.auditLogs.length });
});

app.post('/api/receivables/bulk', async (req: any, res: any) => {
  const incoming = Array.isArray(req.body) ? req.body.map(withDefaultScope) : [];
  if (incoming.length > 0) db.receivables = mergeReceivables(incoming, db.receivables || []);
  saveDb();
  await bumpRealtimeSignal();
  res.json({ success: true, count: db.receivables.length });
});

app.post('/api/products', async (req: any, res: any) => {
  const p = { ...withDefaultScope(req.body), updatedAt: req.body?.updatedAt || new Date().toISOString() };
  if (!p?.id) return res.status(400).json({ error: 'Missing id' });
  const i = db.products.findIndex((x: any) => x.id === p.id);
  if (i >= 0) db.products[i] = preferNewerProduct(p, db.products[i]); else db.products.push(p);
  saveDb();
  await syncToSupabase();
  res.json({ success: true, count: db.products.length });
});

app.delete('/api/products/:id', async (req: any, res: any) => {
  db.products = db.products.filter((p: any) => p.id !== req.params.id);
  saveDb();
  await deleteFromSupabase('products', 'id', [req.params.id]).catch((e) => console.error('[SalesFlow] Supabase product delete failed:', e?.message));
  await syncToSupabase();
  res.json({ success: true, count: db.products.length });
});

app.post('/api/products/bulk', async (req: any, res: any) => {
  const oldProductIds = (db.products || []).map((p: any) => p.id);
  const incoming = Array.isArray(req.body) ? req.body.map(withDefaultScope) : [];
  if (Array.isArray(req.body) && incoming.length === 0) {
    db.products = [];
  } else if (incoming.length > 0) {
    const touchedScopes = incoming.map((item: any) => ({ companyId: item.companyId, workspaceId: item.workspaceId, spaceId: item.spaceId }));
    const untouched = (db.products || []).filter((product: any) => !touchedScopes.some(scope => sameScope(product, scope)));
    db.products = [...untouched, ...mergeProductLists(incoming, (db.products || []).filter((product: any) => touchedScopes.some(scope => sameScope(product, scope))))];
  }
  saveDb();
  const removedProductIds = oldProductIds.filter((id: string) => !(db.products || []).some((p: any) => p.id === id));
  await deleteFromSupabase('products', 'id', removedProductIds).catch((e) => console.error('[SalesFlow] Supabase products bulk delete failed:', e?.message));
  await syncToSupabase();
  res.json({ success: true, count: db.products.length });
});

app.post('/api/comandas', async (req: any, res: any) => {
  const c = { ...withDefaultScope(req.body), updatedAt: req.body?.updatedAt || new Date().toISOString() };
  if (!c?.id) return res.status(400).json({ error: 'Missing id' });
  const i = db.comandas.findIndex((x: any) => x.id === c.id);
  if (i >= 0) db.comandas[i] = preferNewerComanda(c, db.comandas[i]); else db.comandas.unshift(c);
  saveDb();
  await syncToSupabase();
  res.json({ success: true, count: db.comandas.length });
});

app.delete('/api/comandas/:id', async (req: any, res: any) => {
  db.comandas = db.comandas.filter((c: any) => c.id !== req.params.id);
  saveDb();
  await deleteFromSupabase('comandas', 'id', [req.params.id]).catch((e) => console.error('[SalesFlow] Supabase comanda delete failed:', e?.message));
  await syncToSupabase();
  res.json({ success: true, count: db.comandas.length });
});

app.post('/api/comandas/bulk', async (req: any, res: any) => {
  const oldComandaIds = (db.comandas || []).map((c: any) => c.id);
  const incoming = Array.isArray(req.body) ? req.body.map(withDefaultScope) : [];
  if (Array.isArray(req.body) && incoming.length === 0) {
    db.comandas = [];
  } else if (incoming.length > 0) {
    const touchedScopes = incoming.map((item: any) => ({ companyId: item.companyId, workspaceId: item.workspaceId, spaceId: item.spaceId }));
    const untouched = (db.comandas || []).filter((comanda: any) => !touchedScopes.some(scope => sameScope(comanda, scope)));
    db.comandas = [...untouched, ...mergeComandaLists(incoming, (db.comandas || []).filter((comanda: any) => touchedScopes.some(scope => sameScope(comanda, scope))))];
  }
  saveDb();
  const removedComandaIds = oldComandaIds.filter((id: string) => !(db.comandas || []).some((c: any) => c.id === id));
  await deleteFromSupabase('comandas', 'id', removedComandaIds).catch((e) => console.error('[SalesFlow] Supabase comandas bulk delete failed:', e?.message));
  await syncToSupabase();
  res.json({ success: true, count: db.comandas.length });
});

app.post('/api/notifications', async (req: any, res: any) => {
  if (req.body) {
    db.notifications.unshift(withDefaultScope(req.body));
    db.notifications = db.notifications.slice(0, 50);
  }
  saveDb();
  await syncToSupabase();
  res.json({ success: true, count: db.notifications.length });
});

app.post('/api/reset', async (_req: any, res: any) => {
  db.products = [];
  db.comandas = [];
  db.notifications = [];
  db.stockMovements = [];
  db.receivables = [];
  db.categoriesByScope = {};
  db.unidadesByScope = {};
  saveDb();
  if (supabase) {
    await Promise.all([
      supabase.from('products').delete().neq('id', ''),
      supabase.from('comandas').delete().neq('id', ''),
      supabase.from('notifications').delete().neq('id', ''),
      supabase.from('stock_movements').delete().neq('id', '')
    ]).catch((e) => console.error('[SalesFlow] Supabase reset delete failed:', e?.message));
  }
  await syncToSupabase();
  res.json({ success: true });
});

app.get('/api/stock-movements', (req: any, res: any) => {
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  let movements = db.stockMovements || [];
  if (startDate) {
    movements = movements.filter((m: any) => new Date(m.timestamp) >= new Date(startDate));
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    movements = movements.filter((m: any) => new Date(m.timestamp) <= end);
  }
  res.json({ success: true, movements: movements.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) });
});

app.post('/api/stock-movements', async (req: any, res: any) => {
  const movement = withDefaultScope(req.body);
  if (!movement?.id) return res.status(400).json({ error: 'Missing id' });
  if (!db.stockMovements) db.stockMovements = [];
  db.stockMovements.unshift(movement);
  if (db.stockMovements.length > 1000) db.stockMovements = db.stockMovements.slice(0, 1000);
  saveDb();
  await syncToSupabase();
  res.json({ success: true, movement });
});

app.post('/api/whatsapp/config', async (req: any, res: any) => {
  if (req.body?.number) db.whatsNumber = req.body.number;
  saveDb();
  await syncToSupabase();
  res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
});

app.get('/api/whatsapp/evolution-health', async (_req: any, res: any) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.json(await checkEvolutionHealth());
});

app.post('/api/whatsapp/send-comanda-link', async (req: any, res: any) => {
  const comanda = req.body?.comanda;
  if (!comanda?.id) return res.status(400).json({ success: false, error: 'Comanda inválida.' });

  const accessUrl = req.body?.accessUrl || `${getPublicOrigin(req)}?company=${encodeURIComponent(comanda.companyId || DEFAULT_SCOPE.companyId)}&workspace=${encodeURIComponent(comanda.workspaceId || DEFAULT_SCOPE.workspaceId)}&space=${encodeURIComponent(comanda.spaceId || DEFAULT_SCOPE.spaceId)}&comanda=${encodeURIComponent(comanda.id)}`;
  const message = req.body?.message || getComandaAccessMessage(comanda, accessUrl);
  const phone = comanda.clientPhone || req.body?.phone || '';
  const number = normalizeWhatsAppNumber(phone);
  const manualUrl = getManualWhatsAppUrl(phone, message);

  let result: any = { success: false, error: 'Telefone do cliente não cadastrado.' };
  if (number) {
    result = await sendEvolutionText(number, message);
  }

  const notification = {
    ...withDefaultScope(comanda),
    id: `NOT-W-LINK-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toISOString(),
    recipient: comanda.clientName || 'Cliente',
    course: comanda.courseOrTraining || 'Geral',
    contact: phone || 'Sem telefone',
    type: 'WhatsApp',
    message,
    status: result.success ? 'Sucesso' : 'Falha',
    sender: result.success ? (db.whatsNumber || 'Evolution') : 'Evolution indisponível'
  };

  db.notifications.unshift(notification);
  db.notifications = db.notifications.slice(0, 50);
  saveDb();
  await syncToSupabase();

  res.status(result.success ? 200 : 202).json({
    success: result.success,
    error: result.error,
    notification,
    accessUrl,
    message,
    manualUrl,
    evolution: result.data
  });
});

app.post('/api/whatsapp/send-comanda-update', async (req: any, res: any) => {
  const { comanda, updateType, accessUrl: providedUrl } = req.body || {};
  if (!comanda?.id) return res.status(400).json({ success: false, error: 'Comanda inválida.' });

  const accessUrl = providedUrl || `${getPublicOrigin(req)}?company=${encodeURIComponent(comanda.companyId || DEFAULT_SCOPE.companyId)}&workspace=${encodeURIComponent(comanda.workspaceId || DEFAULT_SCOPE.workspaceId)}&space=${encodeURIComponent(comanda.spaceId || DEFAULT_SCOPE.spaceId)}&comanda=${encodeURIComponent(comanda.id)}`;
  const message = getComandaUpdateMessage(comanda, accessUrl, updateType || 'update');
  const phone = comanda.clientPhone || '';
  const number = normalizeWhatsAppNumber(phone);
  const manualUrl = getManualWhatsAppUrl(phone, message);

  let result: any = { success: false, error: 'Telefone do cliente não cadastrado.' };
  if (number) {
    result = await sendEvolutionText(number, message);
  }

  const notification = {
    ...withDefaultScope(comanda),
    id: `NOT-W-UPD-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toISOString(),
    recipient: comanda.clientName || 'Cliente',
    course: comanda.courseOrTraining || 'Geral',
    contact: phone || 'Sem telefone',
    type: 'WhatsApp',
    message,
    status: result.success ? 'Sucesso' : 'Falha',
    sender: result.success ? (db.whatsNumber || 'Evolution') : 'Evolution indisponível'
  };

  db.notifications.unshift(notification);
  db.notifications = db.notifications.slice(0, 50);
  saveDb();
  await syncToSupabase();

  res.status(result.success ? 200 : 202).json({
    success: result.success,
    error: result.error,
    notification,
    accessUrl,
    message,
    manualUrl,
    evolution: result.data
  });
});

app.post('/api/whatsapp/connect', async (req: any, res: any) => {
  if (req.body?.number) db.whatsNumber = req.body.number;
  else {
    const ddds = ['11', '12', '19', '21', '31', '41', '51'];
    const ddd = ddds[Math.floor(Math.random() * ddds.length)];
    db.whatsNumber = `+55 (${ddd}) 9${Math.floor(8100 + Math.random() * 1800)}-${Math.floor(1000 + Math.random() * 8999)}`;
  }
  db.whatsStatus = 'connecting';
  saveDb();
  await syncToSupabase();
  setTimeout(() => {
    if (db.whatsStatus === 'connecting') {
      db.whatsStatus = 'connected';
      saveDb();
      syncToSupabase().catch(() => {});
    }
  }, 4500);
  res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
});

app.post('/api/whatsapp/force-connect', async (_req: any, res: any) => {
  db.whatsStatus = 'connected';
  saveDb();
  await syncToSupabase();
  res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
});

app.post('/api/whatsapp/disconnect', async (_req: any, res: any) => {
  db.whatsStatus = 'disconnected';
  saveDb();
  await syncToSupabase();
  res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
});

// --- Handler ---
let db: any = null;
let initialized = false;

async function ensureInit() {
  if (initialized) return;
  initialized = true;
  await initSupabase();
  db = loadDb();
  if (db.products.length === 0) {
    const pulled = await pullFromSupabase(db);
    if (pulled) {
      db = pulled;
      saveDb();
    }
  }
}

export default async function handler(req: any, res: any) {
  try {
    await ensureInit();
    return app(req, res);
  } catch (err: any) {
    console.error('[SalesFlow API] Error:', err?.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
