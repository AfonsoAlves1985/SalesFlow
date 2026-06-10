// @ts-nocheck
const { createApp } = require('../server.js');

let app = null;

module.exports = async function handler(req, res) {
  try {
    if (!app) {
      console.log('[SalesFlow API] Creating Express app...');
      app = await createApp();
      console.log('[SalesFlow API] Express app created successfully');
    }
    return app(req, res);
  } catch (err) {
    console.error('[SalesFlow API] Handler error:', err?.message || err);
    console.error('[SalesFlow API] Stack:', err?.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: err?.message || 'Unknown error'
    });
  }
};
