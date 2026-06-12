import express from 'express';
import fs from 'fs';
import path from 'path';

const isVercel = process.env.VERCEL === '1';
const DB_FILE = isVercel
  ? path.join('/tmp', 'data-store.json')
  : path.join(process.cwd(), 'data-store.json');

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
  return {
    ...state,
    comandas: Array.isArray(state?.comandas)
      ? state.comandas.filter((c: any) => !isGeneratedModelComanda(c))
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

  const response = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(instance)}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number, text })
  });

  const raw = await response.text();
  let data: any = raw;
  try { data = JSON.parse(raw); } catch {}

  if (!response.ok) {
    return { success: false, error: typeof data === 'string' ? data : data?.message || 'Falha ao enviar pela Evolution.' };
  }

  return { success: true, data };
}

// --- Supabase integration ---
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
let supabase: any = null;

async function initSupabase() {
  if (!supabaseUrl || !supabaseKey) return;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e: any) {
    console.error('[SalesFlow] Failed to init Supabase:', e?.message);
  }
}

async function pullFromSupabase(defaults: any) {
  if (!supabase) return null;
  try {
    const [cats, units, prods, coms, notifs, stockMovs] = await Promise.all([
      supabase.from('categories').select('name'),
      supabase.from('unidades').select('name'),
      supabase.from('products').select('*'),
      supabase.from('comandas').select('*').order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').order('timestamp', { ascending: false }).limit(50),
      supabase.from('stock_movements').select('*').order('timestamp', { ascending: false }).limit(200),
    ]);
    const mappedComandas = (coms.data || []).map((c: any) => ({
      id: c.id, clientName: c.client_name, clientType: c.client_type,
      clientEmail: c.client_email, clientPhone: c.client_phone,
      courseOrTraining: c.course_or_training, month: c.month, status: c.status,
      createdAt: c.created_at, closedAt: c.closed_at, unit: c.units,
      closureReminderActive: !!c.closure_reminder_active, items: c.items || []
    }));
    const generatedIds = mappedComandas
      .filter(isGeneratedModelComanda)
      .map((c: any) => c.id)
      .filter(Boolean);
    if (generatedIds.length > 0) {
      await supabase.from('comandas').delete().in('id', generatedIds);
    }
    return sanitizeState({
      ...defaults,
      categories: (cats.data || []).map((c: any) => c.name),
      unidades: (units.data || []).map((u: any) => u.name),
      products: (prods.data || []).map((p: any) => ({
        id: p.id, code: p.code, name: p.name,
        price: Number(p.price) || 0, stock: Number(p.stock) || 0, category: p.category,
        image: p.image || undefined
      })),
      comandas: mappedComandas,
      notifications: (notifs.data || []).map((n: any) => ({
        id: n.id, timestamp: n.timestamp, recipient: n.recipient,
        course: n.course, contact: n.contact, type: n.type,
        message: n.message, status: n.status, sender: n.sender
      })),
      stockMovements: (stockMovs.data || []).map((m: any) => ({
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

    await Promise.all([
      upsertTable('categories', 'name', db.categories.map((n: string) => ({ name: n }))),
      upsertTable('unidades', 'name', db.unidades.map((n: string) => ({ name: n }))),
      upsertTable('products', 'id', db.products.map((p: any) => ({
        id: p.id, code: p.code, name: p.name,
        price: Number(p.price) || 0, stock: Number(p.stock) || 0, category: p.category,
        image: p.image || null
      }))),
      upsertTable('comandas', 'id', db.comandas.map((c: any) => ({
        id: c.id, client_name: c.clientName, client_type: c.clientType,
        client_email: c.clientEmail || null, client_phone: c.clientPhone || null,
        course_or_training: c.courseOrTraining, month: c.month, status: c.status,
        created_at: c.createdAt, closed_at: c.closedAt || null, units: c.unit || null,
        closure_reminder_active: !!c.closureReminderActive, items: c.items || []
      }))),
      upsertTable('notifications', 'id', db.notifications.map((n: any) => ({
        id: n.id, timestamp: n.timestamp, recipient: n.recipient,
        course: n.course, contact: n.contact, type: n.type,
        message: n.message, status: n.status, sender: n.sender || null
      }))),
      upsertTable('stock_movements', 'id', (db.stockMovements || []).map((m: any) => ({
        id: m.id, product_id: m.productId, product_name: m.productName,
        product_code: m.productCode, type: m.type, quantity: m.quantity,
        price: Number(m.price) || 0, total_value: Number(m.totalValue) || 0,
        reference: m.reference, timestamp: m.timestamp
      }))),
    ]);
  } catch (e: any) {
    console.error('[SalesFlow] Supabase sync failed:', e?.message);
  }
}

// --- DB persistence ---
function loadDb() {
    const defaults = {
    products: [],
    comandas: [],
    notifications: [],
    stockMovements: [],
    categories: ['Bebidas', 'Alimentos', 'Papelaria', 'Vestuário', 'Acessórios'],
    unidades: ['Sede Principal', 'Filial Norte', 'Filial Sul'],
    whatsStatus: 'disconnected',
    whatsNumber: '+55 (11) 99999-9999'
  };
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (data.products) return sanitizeState({ ...defaults, ...data });
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

// --- Express app setup ---
const app = express();
app.use(express.json({ limit: '15mb' }));

app.get('/api/state', async (_req: any, res: any) => {
  const pulled = await pullFromSupabase(db);
  if (pulled) {
    db = pulled;
    saveDb();
  }
  res.json(db);
});

app.post('/api/state/sync', async (req: any, res: any) => {
  // Track removed IDs for Supabase deletion
  const oldComandaIds = (db.comandas || []).map((c: any) => c.id);
  const oldNotificationIds = (db.notifications || []).map((n: any) => n.id);
  const oldStockMovementIds = (db.stockMovements || []).map((m: any) => m.id);

  Object.assign(db, req.body);
  saveDb();

  // Delete removed items from Supabase
  if (supabase) {
    const removedComandaIds = oldComandaIds.filter((id: string) => !(db.comandas || []).some((c: any) => c.id === id));
    const removedNotificationIds = oldNotificationIds.filter((id: string) => !(db.notifications || []).some((n: any) => n.id === id));
    const removedStockMovementIds = oldStockMovementIds.filter((id: string) => !(db.stockMovements || []).some((m: any) => m.id === id));
    const deletePromises: Promise<any>[] = [];
    if (removedComandaIds.length > 0) deletePromises.push(supabase.from('comandas').delete().in('id', removedComandaIds));
    if (removedNotificationIds.length > 0) deletePromises.push(supabase.from('notifications').delete().in('id', removedNotificationIds));
    if (removedStockMovementIds.length > 0) deletePromises.push(supabase.from('stock_movements').delete().in('id', removedStockMovementIds));
    await Promise.all(deletePromises);
  }

  syncToSupabase().catch(() => {});
  res.json({ success: true, ...db });
});

app.post('/api/products', (req: any, res: any) => {
  const p = req.body;
  if (!p?.id) return res.status(400).json({ error: 'Missing id' });
  const i = db.products.findIndex((x: any) => x.id === p.id);
  if (i >= 0) db.products[i] = p; else db.products.push(p);
  saveDb();
  syncToSupabase().catch(() => {});
  res.json({ success: true, products: db.products });
});

app.delete('/api/products/:id', (req: any, res: any) => {
  db.products = db.products.filter((p: any) => p.id !== req.params.id);
  saveDb();
  syncToSupabase().catch(() => {});
  res.json({ success: true, products: db.products });
});

app.post('/api/products/bulk', (req: any, res: any) => {
  if (Array.isArray(req.body)) db.products = req.body;
  saveDb();
  syncToSupabase().catch(() => {});
  res.json({ success: true, products: db.products });
});

app.post('/api/comandas', (req: any, res: any) => {
  const c = req.body;
  if (!c?.id) return res.status(400).json({ error: 'Missing id' });
  const i = db.comandas.findIndex((x: any) => x.id === c.id);
  if (i >= 0) db.comandas[i] = c; else db.comandas.unshift(c);
  saveDb();
  syncToSupabase().catch(() => {});
  res.json({ success: true, comandas: db.comandas });
});

app.delete('/api/comandas/:id', (req: any, res: any) => {
  db.comandas = db.comandas.filter((c: any) => c.id !== req.params.id);
  saveDb();
  syncToSupabase().catch(() => {});
  res.json({ success: true, comandas: db.comandas });
});

app.post('/api/comandas/bulk', (req: any, res: any) => {
  if (Array.isArray(req.body)) db.comandas = req.body;
  saveDb();
  syncToSupabase().catch(() => {});
  res.json({ success: true, comandas: db.comandas });
});

app.post('/api/notifications', (req: any, res: any) => {
  if (req.body) {
    db.notifications.unshift(req.body);
    db.notifications = db.notifications.slice(0, 50);
  }
  saveDb();
  syncToSupabase().catch(() => {});
  res.json({ success: true, notifications: db.notifications });
});

app.post('/api/reset', (_req: any, res: any) => {
  db.products = [];
  db.comandas = [];
  db.notifications = [];
  db.stockMovements = [];
  saveDb();
  syncToSupabase().catch(() => {});
  res.json({ success: true, ...db });
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

app.post('/api/stock-movements', (req: any, res: any) => {
  const movement = req.body;
  if (!movement?.id) return res.status(400).json({ error: 'Missing id' });
  if (!db.stockMovements) db.stockMovements = [];
  db.stockMovements.unshift(movement);
  if (db.stockMovements.length > 1000) db.stockMovements = db.stockMovements.slice(0, 1000);
  saveDb();
  syncToSupabase().catch(() => {});
  res.json({ success: true, movement });
});

app.post('/api/whatsapp/config', (req: any, res: any) => {
  if (req.body?.number) db.whatsNumber = req.body.number;
  saveDb();
  res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
});

app.post('/api/whatsapp/send-comanda-link', async (req: any, res: any) => {
  const comanda = req.body?.comanda;
  if (!comanda?.id) return res.status(400).json({ success: false, error: 'Comanda inválida.' });

  const accessUrl = req.body?.accessUrl || `${getPublicOrigin(req)}?comanda=${encodeURIComponent(comanda.id)}`;
  const message = req.body?.message || getComandaAccessMessage(comanda, accessUrl);
  const phone = comanda.clientPhone || req.body?.phone || '';
  const number = normalizeWhatsAppNumber(phone);
  const manualUrl = getManualWhatsAppUrl(phone, message);

  let result: any = { success: false, error: 'Telefone do cliente não cadastrado.' };
  if (number) {
    result = await sendEvolutionText(number, message);
  }

  const notification = {
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
  syncToSupabase().catch(() => {});

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

  const accessUrl = providedUrl || `${getPublicOrigin(req)}?comanda=${encodeURIComponent(comanda.id)}`;
  const message = getComandaUpdateMessage(comanda, accessUrl, updateType || 'update');
  const phone = comanda.clientPhone || '';
  const number = normalizeWhatsAppNumber(phone);
  const manualUrl = getManualWhatsAppUrl(phone, message);

  let result: any = { success: false, error: 'Telefone do cliente não cadastrado.' };
  if (number) {
    result = await sendEvolutionText(number, message);
  }

  const notification = {
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
  syncToSupabase().catch(() => {});

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

app.post('/api/whatsapp/connect', (req: any, res: any) => {
  if (req.body?.number) db.whatsNumber = req.body.number;
  else {
    const ddds = ['11', '12', '19', '21', '31', '41', '51'];
    const ddd = ddds[Math.floor(Math.random() * ddds.length)];
    db.whatsNumber = `+55 (${ddd}) 9${Math.floor(8100 + Math.random() * 1800)}-${Math.floor(1000 + Math.random() * 8999)}`;
  }
  db.whatsStatus = 'connecting';
  saveDb();
  setTimeout(() => {
    if (db.whatsStatus === 'connecting') {
      db.whatsStatus = 'connected';
      saveDb();
    }
  }, 4500);
  res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
});

app.post('/api/whatsapp/force-connect', (_req: any, res: any) => {
  db.whatsStatus = 'connected';
  saveDb();
  syncToSupabase().catch(() => {});
  res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
});

app.post('/api/whatsapp/disconnect', (_req: any, res: any) => {
  db.whatsStatus = 'disconnected';
  saveDb();
  syncToSupabase().catch(() => {});
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
