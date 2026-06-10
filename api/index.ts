import { createApp } from '../server.js';

let app: Awaited<ReturnType<typeof createApp>> | null = null;

export default async function handler(req: any, res: any) {
  try {
    if (!app) {
      console.log('[SalesFlow API] Creating Express app...');
      app = await createApp();
      console.log('[SalesFlow API] Express app created successfully');
    }
    return app(req, res);
  } catch (err: any) {
    console.error('[SalesFlow API] Handler error:', err?.message || err);
    console.error('[SalesFlow API] Stack:', err?.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: err?.message || 'Unknown error'
    });
  }
}
