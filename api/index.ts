import express from 'express';

const app = express();
app.use(express.json({ limit: '15mb' }));

const db = {
  products: [] as any[],
  comandas: [] as any[],
  notifications: [] as any[],
  categories: ['Bebidas', 'Alimentos', 'Papelaria', 'Vestuário', 'Acessórios'],
  unidades: ['Sede Principal', 'Filial Norte', 'Filial Sul'],
  whatsStatus: 'disconnected' as string,
  whatsNumber: '+55 (11) 99999-9999'
};

app.get('/api/state', (_req: any, res: any) => res.json(db));

app.post('/api/state/sync', (req: any, res: any) => {
  Object.assign(db, req.body);
  res.json({ success: true, ...db });
});

app.post('/api/products', (req: any, res: any) => {
  const p = req.body;
  if (!p?.id) return res.status(400).json({ error: 'Missing id' });
  const i = db.products.findIndex((x: any) => x.id === p.id);
  if (i >= 0) db.products[i] = p; else db.products.push(p);
  res.json({ success: true, products: db.products });
});

app.delete('/api/products/:id', (req: any, res: any) => {
  db.products = db.products.filter((p: any) => p.id !== req.params.id);
  res.json({ success: true, products: db.products });
});

app.post('/api/products/bulk', (req: any, res: any) => {
  if (Array.isArray(req.body)) db.products = req.body;
  res.json({ success: true, products: db.products });
});

app.post('/api/comandas', (req: any, res: any) => {
  const c = req.body;
  if (!c?.id) return res.status(400).json({ error: 'Missing id' });
  const i = db.comandas.findIndex((x: any) => x.id === c.id);
  if (i >= 0) db.comandas[i] = c; else db.comandas.unshift(c);
  res.json({ success: true, comandas: db.comandas });
});

app.delete('/api/comandas/:id', (req: any, res: any) => {
  db.comandas = db.comandas.filter((c: any) => c.id !== req.params.id);
  res.json({ success: true, comandas: db.comandas });
});

app.post('/api/comandas/bulk', (req: any, res: any) => {
  if (Array.isArray(req.body)) db.comandas = req.body;
  res.json({ success: true, comandas: db.comandas });
});

app.post('/api/notifications', (req: any, res: any) => {
  if (req.body) {
    db.notifications.unshift(req.body);
    db.notifications = db.notifications.slice(0, 50);
  }
  res.json({ success: true, notifications: db.notifications });
});

app.post('/api/reset', (_req: any, res: any) => {
  db.products = [];
  db.comandas = [];
  db.notifications = [];
  res.json({ success: true, ...db });
});

app.post('/api/whatsapp/config', (req: any, res: any) => {
  if (req.body?.number) db.whatsNumber = req.body.number;
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
  res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
});

app.post('/api/whatsapp/force-connect', (_req: any, res: any) => {
  db.whatsStatus = 'connected';
  res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
});

app.post('/api/whatsapp/disconnect', (_req: any, res: any) => {
  db.whatsStatus = 'disconnected';
  res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
});

app.get('/api/events', (req: any, res: any) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  res.write('data: {"connected":true}\n\n');
  const keepAlive = setInterval(() => { try { res.write(':\n\n'); } catch {} }, 20000);
  req.on('close', () => clearInterval(keepAlive));
});

export default async function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[SalesFlow API] Error:', err?.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
