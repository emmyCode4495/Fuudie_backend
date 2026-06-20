# Fuudie — Backend

> **Microservices backend for a multi-category commerce and food delivery platform**
> Built with Node.js · TypeScript · Express · MongoDB · Docker

Fuudie's backend powers food, grocery, pharmacy, and general retail delivery under a single platform. It is designed as six independently deployable services, each owning its own data, communicating over HTTP behind a single API gateway.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Design Principles](#design-principles)
3. [Services](#services)
4. [Tech Stack](#tech-stack)
5. [Getting Started](#getting-started)
6. [Authentication Flow](#authentication-flow)
7. [Order Engine](#order-engine)
8. [Data Models](#data-models)
9. [API Reference](#api-reference)
10. [Database Design](#database-design)
11. [Error Handling](#error-handling)
12. [Deployment](#deployment)
13. [Roadmap](#roadmap)
14. [License](#license)

---

## Architecture Overview

All client traffic enters through a single API gateway, which authenticates requests and proxies them to the relevant downstream service. Each service owns an isolated MongoDB database — there is no shared schema and no cross-service joins.

```
                      +---------------------+
                      |     Mobile App      |
                      |   (React Native)    |
                      +----------+----------+
                                 | HTTPS
                      +----------v----------+
                      |     API Gateway      |
                      |  Auth injection      |
                      |  Route proxying      |
                      +--+---+---+---+---+--+
                         |   |   |   |   |
       +-----------------+   |   |   |   +-----------------+
       |           +---------+   +---------+               |
       v           v                       v               v
+-----------+ +-----------+         +----------+  +--------------+
|   User    | |Restaurant |         |  Store   |  |   Catalog    |
| Service   | | Service   |         | Service  |  |   Service    |
+-----+-----+ +-----+-----+         +----+-----+  +------+-------+
      |               |                  |                |
      v               v                  v                v
   MongoDB         MongoDB            MongoDB          MongoDB
   (users)      (restaurants)    (stores/cities)    (products)

                      +------------------+
                      |   Order Service   |
                      +------+-----------+
                             | validates orders against
                             | store, restaurant, and catalog services
                             v
                          MongoDB
                         (orders)
```

---

## Design Principles

- **Each service owns its data.** No shared databases — schema changes in one service cannot break another, and each service can be scaled or migrated independently.
- **The gateway is the only public entry point.** Individual services are never directly reachable in production.
- **Auth is verified once, trusted downstream.** The gateway decodes the JWT and injects `x-user-id` / `x-user-email` / `x-user-role` headers; downstream services trust these rather than re-verifying the token on every call.
- **Pricing is server-authoritative.** Client-supplied prices are never trusted — the order service re-fetches current prices from the catalog/restaurant service at order time.
- **Internal endpoints are gateway-blocked.** Routes like `/internal/order-update` return `403` for any request that didn't originate from another service.

---

## Services

| Service | Database | Responsibility |
|---|---|---|
| `api-gateway` | — | Auth injection, route proxying, internal-endpoint protection |
| `user-service` | `fuudie-users` | Registration, login, JWT issuance, profile management |
| `restaurant-service` | `fuudie-restaurants` | Food menus, dishes, variants, add-ons |
| `order-service` | `fuudie-orders` | Universal order engine across all store types |
| `store-service` | `fuudie-stores` | Cities, top-level categories, store profiles |
| `catalog-service` | `fuudie-catalog` | Products for grocery, pharmacy, and retail stores |

---

## Tech Stack

| Category | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Language | TypeScript 5+ |
| Framework | Express 4 |
| Database | MongoDB 7+ via Mongoose 8 |
| Auth | JSON Web Tokens |
| HTTP client | Axios |
| Validation | express-validator |
| Security | Helmet, CORS |
| Containerization | Docker + Docker Compose |
| Deployment | Render (per-service Docker web services) |

---

## Getting Started

### Option A — Docker Compose (recommended)

```bash
git clone https://github.com/emmyCode4495/Fuudie_backend.git
cd Fuudie_backend
cp .env.example .env   # fill in MongoDB URIs and JWT secrets
docker compose -f docker-compose.dev.yml up --build
```

### Option B — Run services individually

```bash
cd services/store-service
cp .env.example .env
npm install
npm run dev
```

Start order matters on first boot, since downstream services must be reachable when upstream services validate against them:

```
1. user-service
2. store-service
3. restaurant-service
4. catalog-service
5. order-service
6. api-gateway   ← last
```

---

## Authentication Flow

```
1. POST /api/auth/login → user-service verifies credentials, issues access + refresh JWTs
2. Client stores both tokens
3. Client → GET /api/orders/my-orders, Authorization: Bearer <accessToken>
4. Gateway verifies the signature, decodes { id, email, role }
5. Gateway injects x-user-id / x-user-email / x-user-role into the forwarded request
6. Downstream service reads the headers — never re-verifies the token
7. On expiry → POST /api/auth/refresh issues a new access token
```

---

## Order Engine

The order service is store-agnostic: it routes item validation to the correct downstream service based on store type, then computes pricing entirely server-side.

```
1. Fetch store (retried up to 3×) → confirm status = "active", read deliveryFee / minimumOrder
2. Resolve item source → restaurant-service (food) or catalog-service (everything else)
3. Validate each item → exists, in stock, sufficient quantity
   price is read from the source service — client-supplied price is ignored entirely
4. Compute pricing:
     subtotal    = Σ(serverPrice × qty)
     deliveryFee = store.deliveryFee        (0 for pickup)
     tax         = subtotal × TAX_RATE
     total       = subtotal + deliveryFee + tax
5. Persist the order
6. Notify catalog-service to decrement stock (fire-and-forget; failure does not roll back the order)
```

**Retry policy:** up to 3 attempts, linear backoff (1s → 2s → 3s), retried on `502/503/504/ECONNREFUSED/ETIMEDOUT`, failed fast on `400/404/422`.

---

## Data Models

```ts
// Order (order-service)
{
  orderNumber, customerId, storeId, storeType, storeName,   // storeName/storeType denormalized
  items: [{ itemId, itemSource, name, price, quantity, variant?, addOns?, subtotal }],
  subtotal, deliveryFee, tax, total,
  deliveryType: "delivery" | "pickup",
  status: "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled",
  paymentStatus, paymentMethod
}

// Product (catalog-service)
{
  name, storeId, storeCategory, categoryId,
  price, sku?, stockCount, inStock,
  requiresPrescription, ageRestricted, tags[]
}
```

Cross-service references (`storeId`, `customerId`) are stored as plain strings, not foreign-key references — since services cannot join across separate databases, frequently-read fields like `storeName` and `storeType` are denormalized onto the order document to avoid a lookup on every read.

---

## API Reference

**Standard response envelope:**

```json
{ "success": true, "data": {} }
{ "success": false, "message": "Store not found" }
{ "success": false, "message": "Validation failed", "errors": [{ "field": "storeId", "message": "Required" }] }
```

**Key endpoints:**

```
POST   /api/auth/register | login | refresh
GET    /api/stores/city/:cityId/category/:categoryId
GET    /api/catalog/products/store/:storeId
POST   /api/orders
GET    /api/orders/my-orders
PATCH  /api/orders/:id/status
```

| Code | Meaning |
|---|---|
| 422 | Unprocessable — inactive store, out of stock, below minimum order |
| 403 | Authenticated but not authorized, or internal-only route |
| 503 | Upstream service unreachable |

---

## Database Design

Each service has its own MongoDB database to guarantee isolation: schema changes can't ripple across services, and each can scale or migrate independently of the others. A single MongoDB Atlas cluster can host all five databases — only the database name in `MONGO_URI` differs per service.

---

## Error Handling

```ts
// Operational (expected, user-facing)
throw new AppError('Store not found', 404);
throw new AppError('Minimum order is ₦1,200', 400);

// Programming errors are caught by an async wrapper and forwarded
// to a global handler, which logs internally and returns a generic 500
```

---

## Deployment

All six services deploy independently as Docker-based web services on Render, each with its own environment variables and build pipeline. The order service's built-in retry logic absorbs the cold-start latency of Render's free tier, so a sleeping dependency doesn't immediately fail an incoming order request.

---

## Roadmap

- [ ] WebSocket-based real-time order status and driver location
- [ ] Dedicated driver service (location tracking, route optimization)
- [ ] Payment gateway integration (Paystack / Flutterwave)
- [ ] Redis caching for high-read, low-write data (cities, categories)
- [ ] Event-driven order lifecycle via a message queue
- [ ] Full test suite (Jest + Supertest per service)
- [ ] Distributed tracing (OpenTelemetry)

---

## License

MIT