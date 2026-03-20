// ─────────────────────────────────────────────────────────────────────────────
// In your api-gateway/src/middleware/proxy.middleware.ts (or config/index.ts),
// add the store-service entry to your service route map, e.g.:
//
//   '/api/categories': 'http://store-service:3004',
//   '/api/cities':     'http://store-service:3004',
//   '/api/stores':     'http://store-service:3004',
//
// If your gateway uses http-proxy-middleware, it might look like:
// ─────────────────────────────────────────────────────────────────────────────

import { createProxyMiddleware } from 'http-proxy-middleware';
import { Application } from 'express';

const STORE_SERVICE_URL = process.env.STORE_SERVICE_URL || 'http://store-service:3004';

export const registerStoreServiceProxy = (app: Application) => {
  const opts = {
    target: STORE_SERVICE_URL,
    changeOrigin: true,
    on: {
      error: (err: Error, _req: unknown, res: unknown) => {
        (res as any).status(502).json({ success: false, message: 'Store service unavailable' });
      },
    },
  };

  app.use('/api/categories', createProxyMiddleware(opts));
  app.use('/api/cities',     createProxyMiddleware(opts));
  app.use('/api/stores',     createProxyMiddleware(opts));
};

// Then call registerStoreServiceProxy(app) in your gateway's index.ts
