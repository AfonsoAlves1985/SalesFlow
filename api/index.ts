import express from 'express';
import fs from 'fs';
import path from 'path';

const isVercel = process.env.VERCEL === '1';
const DB_FILE = isVercel
  ? path.join('/tmp', 'data-store.json')
  : path.join(process.cwd(), 'data-store.json');

let sseClients: any[] = [];
let db: any = loadDb();

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
      return { ...defaults, ...data };
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

const app = express();
app.use(express.json({ limit: '15mb' }));

app.get('/api/state', (_req: any, res: any) => res.json(db));

app.post('/api/state/sync', (req: any, res: any) => {
  Object.assign(db, req.body);
  saveDb();
  broadcast('state_updated', db);
  res.json({ success: true, ...db });
});

app.post('/api/products', (req: any, res: any) => {
  const p = req.body;
  if (!p?.id) return res.status(400).json({ error: 'Missing id' });
  const i = db.products.findIndex((x: any) => x.id === p.id);
  if (i >= 0) db.products[i] = p; else db.products.push(p);
  saveDb();
  broadcast('state_updated', db);
  res.json({ success: true, products: db.products });
});

app.delete('/api/products/:id', (req: any, res: any) => {
  db.products = db.products.filter((p: any) => p.id !== req.params.id);
  saveDb();
  broadcast('state_updated', db);
  res.json({ success: true, products: db.products });
});

app.post('/api/products/bulk', (req: any, res: any) => {
  if (Array.isArray(req.body)) db.products = req.body;
  saveDb();
  broadcast('state_updated', db);
  res.json({ success: true, products: db.products });
});

app.post('/api/comandas', (req: any, res: any) => {
  const c = req.body;
  if (!c?.id) return res.status(400).json({ error: 'Missing id' });
  const i = db.comandas.findIndex((x: any) => x.id === c.id);
  if (i >= 0) db.comandas[i] = c; else db.comandas.unshift(c);
  saveDb();
  broadcast('state_updated', db);
  res.json({ success: true, comandas: db.comandas });
});

app.delete('/api/comandas/:id', (req: any, res: any) => {
  db.comandas = db.comandas.filter((c: any) => c.id !== req.params.id);
  saveDb();
  broadcast('state_updated', db);
  res.json({ success: true, comandas: db.comandas });
});

app.post('/api/comandas/bulk', (req: any, res: any) => {
  if (Array.isArray(req.body)) db.comandas = req.body;
  saveDb();
  broadcast('state_updated', db);
  res.json({ success: true, comandas: db.comandas });
});

app.post('/api/notifications', (req: any, res: any) => {
  if (req.body) {
    db.notifications.unshift(req.body);
    db.notifications = db.notifications.slice(0, 50);
  }
  saveDb();
  broadcast('state_updated', db);
  res.json({ success: true, notifications: db.notifications });
});

app.post('/api/reset', (_req: any, res: any) => {
  db.products = [];
  db.comandas = [];
  db.notifications = [];
  saveDb();
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
  broadcast('state_updated', db);
  res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
});

app.post('/api/whatsapp/disconnect', (_req: any, res: any) => {
  db.whatsStatus = 'disconnected';
  saveDb();
  broadcast('state_updated', db);
  res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
});

app.get('/api/events', (req: any, res: any) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  res.write(': sse-padding\n\n');
  res.write('data: {"connected":true}\n\n');
  sseClients.push(res);
  const keepAlive = setInterval(() => { try { res.write(':\n\n'); } catch {} }, 20000);
  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients = sseClients.filter((c: any) => c !== res);
  });
});

export default async function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[SalesFlow API] Error:', err?.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
