import { createApp } from '../server.js';

let app: any = null;

export default async function handler(req: any, res: any) {
  try {
    if (!app) {
      app = await createApp();
    }
    return app(req, res);
  } catch (err: any) {
    console.error('[SalesFlow API] Error:', err?.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
