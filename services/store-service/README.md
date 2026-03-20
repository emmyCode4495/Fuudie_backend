# store-service

Fuudie microservice that manages **Cities**, **Categories**, and **Stores**.

## Port
`3004`

## Architecture

```
City          — where Fuudie operates (Lagos, Abuja …)
Category      — what kind of store it is (Food, Groceries, Shops …)
Store         — belongs to one City + one Category
```

All cities share the same global category list. When you query
`GET /api/cities/:id/categories` you get the global categories enriched
with the store-count specific to that city.

---

## Quick Start

```bash
cp .env.example .env          # fill in your JWT_SECRET
npm install
npm run dev                   # nodemon + ts-node

# seed default categories & cities
npx ts-node src/scripts/category.seed.ts
npx ts-node src/scripts/city.seed.ts
```

---

## API Reference

### Categories

| Method | Path                        | Auth          | Description                        |
|--------|-----------------------------|---------------|------------------------------------|
| GET    | /api/categories             | Public        | All active categories              |
| GET    | /api/categories/admin/all   | Admin         | All categories (incl. inactive)    |
| GET    | /api/categories/:id         | Public        | Single category by ID              |
| GET    | /api/categories/slug/:slug  | Public        | Single category by slug            |
| POST   | /api/categories             | Admin         | Create category                    |
| PUT    | /api/categories/:id         | Admin         | Update category                    |
| DELETE | /api/categories/:id         | Admin         | Delete (blocked if stores use it)  |

**Create / Update body**
```json
{
  "name":         "Food",
  "description":  "Restaurants and ready-to-eat meal providers.",
  "icon":         "🍔",
  "displayOrder": 1,
  "isActive":     true
}
```

---

### Cities

| Method | Path                          | Auth   | Description                                 |
|--------|-------------------------------|--------|---------------------------------------------|
| GET    | /api/cities                   | Public | All active cities (?country=Nigeria)        |
| GET    | /api/cities/admin/all         | Admin  | All cities (incl. inactive)                 |
| GET    | /api/cities/:id               | Public | Single city by ID                           |
| GET    | /api/cities/slug/:slug        | Public | Single city by slug                         |
| GET    | /api/cities/:id/categories    | Public | Global categories + store count for city    |
| POST   | /api/cities                   | Admin  | Create city                                 |
| PUT    | /api/cities/:id               | Admin  | Update city                                 |
| DELETE | /api/cities/:id               | Admin  | Delete (blocked if stores operate there)    |

**Create / Update body**
```json
{
  "name":    "Lagos",
  "country": "Nigeria",
  "state":   "Lagos State",
  "coordinates": { "latitude": 6.5244, "longitude": 3.3792 },
  "coverImage": "https://cdn.fuudie.com/cities/lagos.jpg"
}
```

---

### Stores

| Method | Path                       | Auth              | Description                              |
|--------|----------------------------|-------------------|------------------------------------------|
| GET    | /api/stores                | Public            | All active stores (?city=&category=&search=&featured=&page=&limit=) |
| GET    | /api/stores/admin/all      | Admin             | All stores (any status)                  |
| GET    | /api/stores/:id            | Public            | Single store by ID                       |
| GET    | /api/stores/slug/:slug     | Public            | Single store by slug                     |
| GET    | /api/stores/city/:cityId   | Public            | All active stores in a city (?category=) |
| GET    | /api/stores/me/stores      | Owner / Admin     | Stores owned by the logged-in user       |
| POST   | /api/stores                | Owner / Admin     | Create store                             |
| PUT    | /api/stores/:id            | Owner / Admin     | Update store (owners: own stores only)   |
| PATCH  | /api/stores/:id/status     | Admin             | Change store status                      |
| DELETE | /api/stores/:id            | Owner / Admin     | Delete store                             |

**Create body (required fields)**
```json
{
  "name":        "Chicken Republic Lekki",
  "description": "Fast food restaurant serving grilled and fried chicken.",
  "category":    "<categoryObjectId>",
  "city":        "<cityObjectId>",
  "phone":       "+2348012345678",
  "email":       "lekki@chickenrepublic.com",
  "address": {
    "street":   "14 Admiralty Way",
    "district": "Lekki Phase 1",
    "postalCode": "106104"
  },
  "coordinates": { "latitude": 6.4360, "longitude": 3.4698 },
  "preparationTime": 20,
  "deliveryRadius":  5,
  "minimumOrder":    1500,
  "deliveryFee":     500,
  "openingHours": [
    { "day": "monday", "isOpen": true, "openTime": "08:00", "closeTime": "22:00" }
  ]
}
```

**Store status lifecycle**
```
pending → active → suspended → closed
```
Stores created by store owners start as `pending` and must be activated by an admin.
Stores created directly by an admin start as `active`.

---

## Docker

```bash
# Development (with volume mount for hot-reload)
docker-compose -f docker-compose.dev.yml up store-service

# Production
docker-compose -f docker-compose-full.yml up store-service

# Run seeds inside the container
docker exec fuudie-store-service-dev \
  npx ts-node src/scripts/category.seed.ts
```

---

## Recommended flow

```
1. POST /api/cities      → create "Lagos"
2. POST /api/categories  → seed 5 default categories (or run seed script)
3. POST /api/stores      → create a store, passing city + category IDs
4. GET  /api/cities/:id/categories  → mobile app fetches categories for a city
5. GET  /api/stores/city/:cityId?category=<id> → filtered store list
```
