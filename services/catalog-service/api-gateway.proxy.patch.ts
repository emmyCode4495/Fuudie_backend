/**
 * api-gateway proxy patch
 * ─────────────────────────────────────────────────────────────────────────────
 * Add these route entries to your existing proxy.middleware.ts in api-gateway.
 * The pattern follows whatever routing logic you already have for
 * restaurant-service and order-service.
 */

// ── New env vars to add to api-gateway (already in docker-compose) ────────────
// STORE_SERVICE_URL   = http://store-service:3004
// CATALOG_SERVICE_URL = http://catalog-service:3005

// ── Route table additions ─────────────────────────────────────────────────────
//
//  Path prefix                          → Target service
//  ───────────────────────────────────────────────────────
//  /api/stores/*                        → STORE_SERVICE_URL
//  /api/cities/*                        → STORE_SERVICE_URL
//  /api/categories/*                    → STORE_SERVICE_URL   (top-level store categories)
//  /api/catalog/products/*              → CATALOG_SERVICE_URL
//  /api/catalog/categories/*            → CATALOG_SERVICE_URL (product sub-categories)
//
// ── Example using http-proxy-middleware (adjust to match your existing code) ──

import { config } from '../config';

const ROUTES: { prefix: string; target: string }[] = [
  { prefix: '/api/users',              target: config.userServiceUrl       },
  { prefix: '/api/restaurants',        target: config.restaurantServiceUrl },
  { prefix: '/api/orders',             target: config.orderServiceUrl      },
  // ↓ New entries
  { prefix: '/api/stores',             target: config.storeServiceUrl      },
  { prefix: '/api/cities',             target: config.storeServiceUrl      },
  { prefix: '/api/categories',         target: config.storeServiceUrl      },
  { prefix: '/api/catalog',            target: config.catalogServiceUrl    },
];

// ── Add these fields to your Config interface in api-gateway/src/config/index.ts
export interface GatewayConfigAdditions {
  storeServiceUrl:   string;   // process.env.STORE_SERVICE_URL   || 'http://localhost:3004'
  catalogServiceUrl: string;   // process.env.CATALOG_SERVICE_URL || 'http://localhost:3005'
}

// ── Internal-only endpoint (not exposed publicly) ─────────────────────────────
// POST /api/catalog/products/internal/order-update
// This is called server-side by order-service → catalog-service.
// It travels over the internal Docker network and never hits the gateway,
// so no additional proxy rule is needed for it.
