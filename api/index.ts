import express from 'express';
import fs from 'fs';
import path from 'path';

const isVercel = process.env.VERCEL === '1';
const DB_FILE = isVercel
  ? path.join('/tmp', 'data-store.json')
  : path.join(process.cwd(), 'data-store.json');

let sseClients: any[] = [];

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
    const [cats, units, prods, coms, notifs] = await Promise.all([
      supabase.from('categories').select('name'),
      supabase.from('unidades').select('name'),
      supabase.from('products').select('*'),
      supabase.from('comandas').select('*').order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').order('timestamp', { ascending: false }).limit(50),
    ]);
    return {
      ...defaults,
      categories: (cats.data || []).map((c: any) => c.name),
      unidades: (units.data || []).map((u: any) => u.name),
      products: (prods.data || []).map((p: any) => ({
        id: p.id, code: p.code, name: p.name,
        price: Number(p.price) || 0, stock: Number(p.stock) || 0, category: p.category
      })),
      comandas: (coms.data || []).map((c: any) => ({
        id: c.id, clientName: c.client_name, clientType: c.client_type,
        clientEmail: c.client_email, clientPhone: c.client_phone,
        courseOrTraining: c.course_or_training, month: c.month, status: c.status,
        createdAt: c.created_at, closedAt: c.closed_at, unit: c.units,
        closureReminderActive: !!c.closure_reminder_active, items: c.items || []
      })),
      notifications: (notifs.data || []).map((n: any) => ({
        id: n.id, timestamp: n.timestamp, recipient: n.recipient,
        course: n.course, contact: n.contact, type: n.type,
        message: n.message, status: n.status, sender: n.sender
      })),
    };
  } catch (e: any) {
    console.error('[SalesFlow] Supabase pull failed:', e?.message);
    return null;
  }
}

async function syncToSupabase() {
  if (!supabase || !db) return;
  try {
    await Promise.all([
      supabase.from('categories').upsert(
        db.categories.map((n: string) => ({ name: n })), { onConflict: 'name' }
      ),
      supabase.from('unidades').upsert(
        db.unidades.map((n: string) => ({ name: n })), { onConflict: 'name' }
      ),
      supabase.from('products').upsert(
        db.products.map((p: any) => ({
          id: p.id, code: p.code, name: p.name,
          price: Number(p.price) || 0, stock: Number(p.stock) || 0, category: p.category
        }))
      ),
      supabase.from('comandas').upsert(
        db.comandas.map((c: any) => ({
          id: c.id, client_name: c.clientName, client_type: c.clientType,
          client_email: c.clientEmail || null, client_phone: c.clientPhone || null,
          course_or_training: c.courseOrTraining, month: c.month, status: c.status,
          created_at: c.createdAt, closed_at: c.closedAt || null, units: c.unit || null,
          closure_reminder_active: !!c.closureReminderActive, items: c.items || []
        }))
      ),
      supabase.from('notifications').upsert(
        db.notifications.map((n: any) => ({
          id: n.id, timestamp: n.timestamp, recipient: n.recipient,
          course: n.course, contact: n.contact, type: n.type,
          message: n.message, status: n.status, sender: n.sender || null
        }))
      ),
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
    categories: ['Bebidas', 'Alimentos', 'Papelaria', 'Vestuário', 'Acessórios'],
    unidades: ['Sede Principal', 'Filial Norte', 'Filial Sul'],
    whatsStatus: 'disconnected',
    whatsNumber: '+55 (11) 99999-9999'
  };
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (data.products) return { ...defaults, ...data };
    }
  } catch {}
  return defaults;
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch {}
}

function broadcast(event: string, data: any) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((c: any) => { try { c.write(msg); } catch {} });
}

// --- Express app setup ---
const app = express();
app.use(express.json({ limit: '15mb' }));

app.get('/api/state', (_req: any, res: any) => res.json(db));

app.post('/api/state/sync', (req: any, res: any) => {
  Object.assign(db, req.body);
  saveDb();
  syncToSupabase();
  broadcast('state_updated', db);
  res.json({ success: true, ...db });
});

app.post('/api/products', (req: any, res: any) => {
  const p = req.body;
  if (!p?.id) return res.status(400).json({ error: 'Missing id' });
  const i = db.products.findIndex((x: any) => x.id === p.id);
  if (i >= 0) db.products[i] = p; else db.products.push(p);
  saveDb();
  syncToSupabase();
  broadcast('state_updated', db);
  res.json({ success: true, products: db.products });
});

app.delete('/api/products/:id', (req: any, res: any) => {
  db.products = db.products.filter((p: any) => p.id !== req.params.id);
  saveDb();
  syncToSupabase();
  broadcast('state_updated', db);
  res.json({ success: true, products: db.products });
});

app.post('/api/products/bulk', (req: any, res: any) => {
  if (Array.isArray(req.body)) db.products = req.body;
  saveDb();
  syncToSupabase();
  broadcast('state_updated', db);
  res.json({ success: true, products: db.products });
});

app.post('/api/comandas', (req: any, res: any) => {
  const c = req.body;
  if (!c?.id) return res.status(400).json({ error: 'Missing id' });
  const i = db.comandas.findIndex((x: any) => x.id === c.id);
  if (i >= 0) db.comandas[i] = c; else db.comandas.unshift(c);
  saveDb();
  syncToSupabase();
  broadcast('state_updated', db);
  res.json({ success: true, comandas: db.comandas });
});

app.delete('/api/comandas/:id', (req: any, res: any) => {
  db.comandas = db.comandas.filter((c: any) => c.id !== req.params.id);
  saveDb();
  syncToSupabase();
  broadcast('state_updated', db);
  res.json({ success: true, comandas: db.comandas });
});

app.post('/api/comandas/bulk', (req: any, res: any) => {
  if (Array.isArray(req.body)) db.comandas = req.body;
  saveDb();
  syncToSupabase();
  broadcast('state_updated', db);
  res.json({ success: true, comandas: db.comandas });
});

app.post('/api/notifications', (req: any, res: any) => {
  if (req.body) {
    db.notifications.unshift(req.body);
    db.notifications = db.notifications.slice(0, 50);
  }
  saveDb();
  syncToSupabase();
  broadcast('state_updated', db);
  res.json({ success: true, notifications: db.notifications });
});

app.post('/api/reset', (_req: any, res: any) => {
  db.products = [];
  db.comandas = [];
  db.notifications = [];
  saveDb();
  syncToSupabase();
  broadcast('state_updated', db);
  res.json({ success: true, ...db });
});

app.post('/api/whatsapp/config', (req: any, res: any) => {
  if (req.body?.number) db.whatsNumber = req.body.number;
  saveDb();
  res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
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
  broadcast('state_updated', db);
  setTimeout(() => {
    if (db.whatsStatus === 'connecting') {
      db.whatsStatus = 'connected';
      saveDb();
      broadcast('state_updated', db);
    }
  }, 4500);
  res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
});

app.post('/api/whatsapp/force-connect', (_req: any, res: any) => {
  db.whatsStatus = 'connected';
  saveDb();
  syncToSupabase();
  broadcast('state_updated', db);
  res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
});

app.post('/api/whatsapp/disconnect', (_req: any, res: any) => {
  db.whatsStatus = 'disconnected';
  saveDb();
  syncToSupabase();
  broadcast('state_updated', db);
  res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
});

app.get('/api/events', (req: any, res: any) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-transform, no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no'
  });
  res.write(': sse-padding to bypass aggressive proxy buffers\n\n');
  res.write('data: {"connected":true}\n\n');
  sseClients.push(res);
  const keepAlive = setInterval(() => { try { res.write(':\n\n'); } catch {} }, 20000);
  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients = sseClients.filter((c: any) => c !== res);
  });
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
