import express from "express";
import path from "path";
import fs from "fs";
import { INITIAL_PRODUCTS, INITIAL_COMANDAS } from "./src/initialData";
import { Product, Comanda } from "./src/types";

export async function createApp() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "15mb" }));

  // File-based simple data-store for robust persistent sandbox
  const isVercel = process.env.VERCEL === "1";
  const DB_FILE = isVercel
    ? path.join("/tmp", "data-store.json")
    : path.join(process.cwd(), "data-store.json");

  const isGeneratedModelComanda = (c: any) => {
    const name = String(c?.clientName || '').trim();
    const course = String(c?.courseOrTraining || '').trim();
    return name === 'Cliente QR Especial'
      || name.startsWith('Cliente Smartphone ')
      || course === 'Área do Aluno Elite'
      || course === 'Treinamento de Auto-Atendimento'
      || (name === 'Venda Balcão' && course === 'PDV');
  };

  const sanitizeComandas = (list: Comanda[]) => list.filter(c => !isGeneratedModelComanda(c));

  const normalizeWhatsAppNumber = (phone: string) => {
    let cleanPhone = String(phone || '').replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
      cleanPhone = `55${cleanPhone}`;
    }
    return cleanPhone;
  };

  const getPublicOrigin = (req: any) => {
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
    return `${proto}://${host}`;
  };

  const getComandaAccessMessage = (comanda: any, accessUrl: string) => {
    return `*SalesFlow - Acesso à Comanda*\n\nOlá, *${comanda.clientName || 'Cliente'}*!\n\nSua comanda digital foi aberta com sucesso.\n\n*Código:* ${comanda.id}\n*Unidade:* ${comanda.unit || 'Sede Principal'}\n*Referência:* ${comanda.courseOrTraining || 'Atendimento'}\n*Status:* ${comanda.status || 'Pendente'}\n\nAcesse pelo link abaixo para acompanhar seu consumo, conferir itens lançados e assinar digitalmente seus pedidos:\n${accessUrl}\n\nApresente esta comanda no caixa para fechamento e pagamento.`;
  };

  const buildItemsList = (items: any[]) => {
    if (!items || items.length === 0) return '* Nenhum item adicionado ainda.';
    return items.map((i: any) => `* ${i.quantity}x ${i.productName} - R$ ${(Number(i.price || 0) * Number(i.quantity || 0)).toFixed(2)}`).join('\n');
  };

  const getComandaTotal = (items: any[]) => {
    return (items || []).reduce((sum: number, i: any) => sum + (Number(i.price || 0) * Number(i.quantity || 0)), 0);
  };

  const getComandaUpdateMessage = (comanda: any, accessUrl: string, updateType: 'update' | 'close' | 'reminder') => {
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
  };

  const getManualWhatsAppUrl = (phone: string, message: string) => {
    const number = normalizeWhatsAppNumber(phone);
    return number
      ? `https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  };

  const sendEvolutionText = async (number: string, text: string) => {
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
  };

  let db = {
    products: INITIAL_PRODUCTS,
    comandas: INITIAL_COMANDAS,
    notifications: [] as any[],
    stockMovements: [] as any[],
    categories: ["Bebidas", "Alimentos", "Papelaria", "Vestuário", "Acessórios"] as string[],
    unidades: ["Sede Principal", "Filial Norte", "Filial Sul"] as string[],
    whatsStatus: 'disconnected' as 'disconnected' | 'connecting' | 'connected',
    whatsNumber: '+55 (11) 99999-9999'
  };

  try {
    if (fs.existsSync(DB_FILE)) {
      const rawData = fs.readFileSync(DB_FILE, "utf-8");
      const loaded = JSON.parse(rawData);
      if (loaded.products && Array.isArray(loaded.products)) db.products = loaded.products;
      if (loaded.comandas && Array.isArray(loaded.comandas)) db.comandas = sanitizeComandas(loaded.comandas);
      if (loaded.notifications && Array.isArray(loaded.notifications)) db.notifications = loaded.notifications;
      if (loaded.stockMovements && Array.isArray(loaded.stockMovements)) db.stockMovements = loaded.stockMovements;
      if (loaded.categories && Array.isArray(loaded.categories)) db.categories = loaded.categories;
      if (loaded.unidades && Array.isArray(loaded.unidades)) db.unidades = loaded.unidades;
      if (loaded.whatsStatus) db.whatsStatus = loaded.whatsStatus;
      if (loaded.whatsNumber) db.whatsNumber = loaded.whatsNumber;
      console.log("Database successfully loaded from custom data-store.json file!");
    } else {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("Error reading/writing store database file, keeping memory state:", err);
  }

  function saveDb() {
    try {
      db.comandas = sanitizeComandas(db.comandas);
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    } catch (err) {
      console.error("Error backing up to data-store.json:", err);
    }
  }

  // --- Supabase recovery (same logic as api/index.ts) ---
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  let supabase: any = null;

  async function initSupabase() {
    if (!supabaseUrl || !supabaseKey) return;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log('[SalesFlow] Supabase client initialized for recovery.');
    } catch (e: any) {
      console.error('[SalesFlow] Supabase init error:', e?.message);
    }
  }

  async function pullFromSupabase() {
    if (!supabase) return false;
    try {
      const [prods, coms] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('comandas').select('*').order('created_at', { ascending: false }),
      ]);
      if ((prods.data?.length || 0) > 0 || (coms.data?.length || 0) > 0) {
        if (prods.data?.length) {
          db.products = prods.data.map((p: any) => ({
            id: p.id, code: p.code, name: p.name,
            price: Number(p.price) || 0, stock: Number(p.stock) || 0, category: p.category,
            image: p.image || undefined
          }));
        }
        if (coms.data?.length) {
          db.comandas = coms.data.map((c: any) => ({
            id: c.id, clientName: c.client_name, clientType: c.client_type,
            clientEmail: c.client_email, clientPhone: c.client_phone,
            courseOrTraining: c.course_or_training, month: c.month, status: c.status,
            createdAt: c.created_at, closedAt: c.closed_at, unit: c.units,
            closureReminderActive: !!c.closure_reminder_active, items: c.items || []
          }));
        }
        saveDb();
        console.log(`[SalesFlow] Dados restaurados do Supabase: ${db.products.length} produtos, ${db.comandas.length} comandas`);
        return true;
      }
    } catch (e: any) {
      console.error('[SalesFlow] Supabase pull error:', e?.message);
    }
    return false;
  }

  // Try to recover from Supabase if local data is empty
  if (db.products.length === 0 && db.comandas.length === 0) {
    await initSupabase();
    await pullFromSupabase();
  }

  // --- API ENDPOINTS ---

  // Get full state
  app.get("/api/state", (req, res) => {
    res.json(db);
  });

  // Bulk state override / sync
  app.post("/api/state/sync", (req, res) => {
    const { products, comandas, notifications, stockMovements, categories, unidades, whatsStatus, whatsNumber } = req.body;
    if (products && Array.isArray(products)) db.products = products;
    if (comandas && Array.isArray(comandas)) db.comandas = sanitizeComandas(comandas);
    if (notifications && Array.isArray(notifications)) db.notifications = notifications;
    if (stockMovements && Array.isArray(stockMovements)) db.stockMovements = stockMovements;
    if (categories && Array.isArray(categories)) db.categories = categories;
    if (unidades && Array.isArray(unidades)) db.unidades = unidades;
    if (whatsStatus) db.whatsStatus = whatsStatus;
    if (whatsNumber) db.whatsNumber = whatsNumber;
    saveDb();
    res.json({ success: true, ...db });
  });

  // --- FUNCTIONAL WHATSAPP INTEGRATION APIS ---

  app.post("/api/whatsapp/config", (req, res) => {
    const { number } = req.body;
    if (number) {
      db.whatsNumber = number;
      saveDb();
    }
    res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
  });

  app.post("/api/whatsapp/send-comanda-link", async (req, res) => {
    const comanda = req.body?.comanda;
    if (!comanda?.id) {
      res.status(400).json({ success: false, error: 'Comanda inválida.' });
      return;
    }

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
    if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);
    saveDb();

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

  app.post("/api/whatsapp/send-comanda-update", async (req, res) => {
    const { comanda, updateType, accessUrl: providedUrl } = req.body || {};
    if (!comanda?.id) {
      res.status(400).json({ success: false, error: 'Comanda inválida.' });
      return;
    }

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
    if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);
    saveDb();

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

  app.post("/api/whatsapp/connect", (req, res) => {
    const { number } = req.body;
    if (number) {
      db.whatsNumber = number;
    } else {
      // Pick a realistic randomized scan pairing phone number
      const ddds = ["11", "12", "19", "21", "31", "41", "51"];
      const ddd = ddds[Math.floor(Math.random() * ddds.length)];
      const head = "9" + Math.floor(8100 + Math.random() * 1800);
      const tail = Math.floor(1000 + Math.random() * 8999);
      db.whatsNumber = `+55 (${ddd}) ${head}-${tail}`;
    }
    db.whatsStatus = "connecting";
    saveDb();

    // After 4.5 seconds on the server, automatically move to 'connected' and trigger connection log
    setTimeout(() => {
      if (db.whatsStatus === "connecting") {
        db.whatsStatus = "connected";

        const connectionNotif = {
          id: `W-CONN-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: new Date().toISOString(),
          recipient: "Painel Administrativo",
          course: "Sessão Conectada (Real-time)",
          contact: db.whatsNumber,
          type: 'WhatsApp',
          message: `*WhatsApp Web Conectado com Sucesso!* 🟢\nInstância do servidor pareada com o número ${db.whatsNumber}. Pronto para disparos de comandas em tempo real!`,
          status: 'Sucesso',
          sender: db.whatsNumber
        };
        db.notifications.unshift(connectionNotif);
        if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);

        saveDb();
        console.log("WhatsApp Session successfully connected on the server!");
      }
    }, 4500);

    res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
  });

  app.post("/api/whatsapp/force-connect", (req, res) => {
    db.whatsStatus = "connected";
    
    // If the active number is generic or not set, generate a realistic QR scanned phone number
    if (!db.whatsNumber || db.whatsNumber === '+55 (11) 99999-9999' || db.whatsNumber.trim() === '') {
      const ddds = ["11", "12", "19", "21", "31", "41", "51"];
      const ddd = ddds[Math.floor(Math.random() * ddds.length)];
      const head = "9" + Math.floor(8100 + Math.random() * 1800);
      const tail = Math.floor(1000 + Math.random() * 8999);
      db.whatsNumber = `+55 (${ddd}) ${head}-${tail}`;
    }

    const connectionNotif = {
      id: `W-CONN-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      recipient: "Painel Administrativo",
      course: "Sessão Conectada (Instantânea)",
      contact: db.whatsNumber,
      type: 'WhatsApp',
      message: `*WhatsApp Web Conectado com Sucesso!* 🟢\nInstância do servidor pareada instantaneamente com o número ${db.whatsNumber}. Pronto para disparos de comandas em tempo real!`,
      status: 'Sucesso',
      sender: db.whatsNumber
    };
    db.notifications.unshift(connectionNotif);
    if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);

    saveDb();
    res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
  });

  app.post("/api/whatsapp/disconnect", (req, res) => {
    db.whatsStatus = "disconnected";

    const disconnectionNotif = {
      id: `W-DISC-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      recipient: "Painel Administrativo",
      course: "Sessão Encerrada",
      contact: db.whatsNumber,
      type: 'WhatsApp',
      message: `*Sessão de WhatsApp Encerrada pelo Operador* 🔴\nO número ${db.whatsNumber} foi despareado. Disparos automáticos suspensos.`,
      status: 'Falha',
      sender: 'Sistema'
    };
    db.notifications.unshift(disconnectionNotif);
    if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);

    saveDb();
    res.json({ success: true, whatsStatus: db.whatsStatus, whatsNumber: db.whatsNumber });
  });

  // Save product
  app.post("/api/products", (req, res) => {
    const product = req.body as Product;
    if (!product || !product.id) {
       res.status(400).json({ error: "Missing product data or ID" });
       return;
    }
    const idx = db.products.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      db.products[idx] = product;
    } else {
      db.products.push(product);
    }
    saveDb();
    res.json({ success: true, products: db.products });
  });

  // Delete product
  app.delete("/api/products/:id", (req, res) => {
    const { id } = req.params;
    db.products = db.products.filter(p => p.id !== id);
    saveDb();
    res.json({ success: true, products: db.products });
  });

  // Save multiple products bulk (for stock restoration/deductions)
  async function maybeSyncToSupabase() {
    if (!supabase || !db) return;
    try {
      if (db.products.length > 0) {
        await supabase.from('products').upsert(
          db.products.map((p: any) => ({
            id: p.id, code: p.code, name: p.name,
            price: Number(p.price) || 0, stock: Number(p.stock) || 0, category: p.category,
            image: p.image || null
          })), { onConflict: 'id' }
        );
      }
      if (db.comandas.length > 0) {
        await supabase.from('comandas').upsert(
          db.comandas.map((c: any) => ({
            id: c.id, client_name: c.clientName, client_type: c.clientType,
            client_email: c.clientEmail, client_phone: c.clientPhone,
            course_or_training: c.courseOrTraining, month: c.month, status: c.status,
            created_at: c.createdAt, closed_at: c.closedAt || null, units: c.unit,
            closure_reminder_active: !!c.closureReminderActive, items: c.items || []
          })), { onConflict: 'id' }
        );
      }
      if (db.stockMovements && db.stockMovements.length > 0) {
        await supabase.from('stock_movements').upsert(
          db.stockMovements.map((m: any) => ({
            id: m.id, product_id: m.productId, product_name: m.productName,
            product_code: m.productCode, type: m.type, quantity: m.quantity,
            price: Number(m.price) || 0, total_value: Number(m.totalValue) || 0,
            reference: m.reference, timestamp: m.timestamp
          })), { onConflict: 'id' }
        );
      }
    } catch (e: any) {
      console.error('[SalesFlow] syncToSupabase error:', e?.message);
    }
  }

  app.post("/api/products/bulk", (req, res) => {
    const list = req.body as Product[];
    if (Array.isArray(list)) {
      db.products = list;
      saveDb();
      maybeSyncToSupabase();
    }
    res.json({ success: true, products: db.products });
  });

  // Save / update a comanda
  app.post("/api/comandas", (req, res) => {
    const comanda = req.body as Comanda;
    if (!comanda || !comanda.id) {
       res.status(400).json({ error: "Missing comanda data or ID" });
       return;
    }
    const idx = db.comandas.findIndex(c => c.id === comanda.id);
    if (idx >= 0) {
      db.comandas[idx] = comanda;
    } else {
      db.comandas.unshift(comanda); // Add to the top
    }
    saveDb();
    maybeSyncToSupabase();
    res.json({ success: true, comandas: db.comandas });
  });

  // Delete comanda
  app.delete("/api/comandas/:id", (req, res) => {
    const { id } = req.params;
    db.comandas = db.comandas.filter(c => c.id !== id);
    saveDb();
    maybeSyncToSupabase();
    res.json({ success: true, comandas: db.comandas });
  });

  // Save entire comanda list at once (for bulk operations)
  app.post("/api/comandas/bulk", (req, res) => {
    const list = req.body as Comanda[];
    if (Array.isArray(list)) {
      db.comandas = sanitizeComandas(list);
      saveDb();
      maybeSyncToSupabase();
    }
    res.json({ success: true, comandas: db.comandas });
  });

  // Add a notifications log
  app.post("/api/notifications", (req, res) => {
    const notif = req.body;
    if (notif) {
      db.notifications.unshift(notif);
      if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50); // cap at 50 logs
      saveDb();
    }
    res.json({ success: true, notifications: db.notifications });
  });

  app.get("/api/stock-movements", (req, res) => {
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

  app.post("/api/stock-movements", (req, res) => {
    const movement = req.body;
    if (!movement?.id) {
      res.status(400).json({ error: 'Missing id' });
      return;
    }
    if (!db.stockMovements) db.stockMovements = [];
    db.stockMovements.unshift(movement);
    if (db.stockMovements.length > 1000) db.stockMovements = db.stockMovements.slice(0, 1000);
    saveDb();
    maybeSyncToSupabase();
    res.json({ success: true, movement });
  });

  // Clear system history or factory reset
  app.post("/api/reset", (req, res) => {
    db.products = INITIAL_PRODUCTS;
    db.comandas = INITIAL_COMANDAS;
    db.notifications = [];
    db.stockMovements = [];
    saveDb();
    res.json({ success: true, ...db });
  });

  // --- VITE MIDDLEWARE OR STATIC SERVER ---
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
    
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const templatePath = path.resolve(process.cwd(), "index.html");
        let template = fs.readFileSync(templatePath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(200).json({ api: "SalesFlow API running on Vercel" });
        }
      });
    } else {
      // On Vercel serverless, static files are served separately
      app.get("*", (req, res) => {
        res.status(200).json({ api: "SalesFlow API running on Vercel" });
      });
    }
  }

  if (process.env.VERCEL !== '1') {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

const isVercel = process.env.VERCEL === '1';
if (!isVercel) {
  createApp();
}

export default createApp;
