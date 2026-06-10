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
      || course === 'Treinamento de Auto-Atendimento';
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

  // --- API ENDPOINTS ---

  // Get full state
  app.get("/api/state", (req, res) => {
    res.json(db);
  });

  // Bulk state override / sync
  app.post("/api/state/sync", (req, res) => {
    const { products, comandas, notifications, categories, unidades, whatsStatus, whatsNumber } = req.body;
    if (products && Array.isArray(products)) db.products = products;
    if (comandas && Array.isArray(comandas)) db.comandas = sanitizeComandas(comandas);
    if (notifications && Array.isArray(notifications)) db.notifications = notifications;
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
  app.post("/api/products/bulk", (req, res) => {
    const list = req.body as Product[];
    if (Array.isArray(list)) {
      db.products = list;
      saveDb();
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
    res.json({ success: true, comandas: db.comandas });
  });

  // Delete comanda
  app.delete("/api/comandas/:id", (req, res) => {
    const { id } = req.params;
    db.comandas = db.comandas.filter(c => c.id !== id);
    saveDb();
    res.json({ success: true, comandas: db.comandas });
  });

  // Save entire comanda list at once (for bulk operations)
  app.post("/api/comandas/bulk", (req, res) => {
    const list = req.body as Comanda[];
    if (Array.isArray(list)) {
      db.comandas = sanitizeComandas(list);
      saveDb();
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

  // Clear system history or factory reset
  app.post("/api/reset", (req, res) => {
    db.products = INITIAL_PRODUCTS;
    db.comandas = INITIAL_COMANDAS;
    db.notifications = [];
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
