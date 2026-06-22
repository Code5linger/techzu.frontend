# Real-Time Limited-Edition Sneaker Drop System

A high-concurrency inventory management system built for the Techzu Ichicode technical assessment. Users reserve limited-edition sneakers in real time, complete purchases within a 60-second window, and see live stock updates across all connected clients.

---

## Live Demo

| | URL |
|---|---|
| **Frontend** | `<frontend-url>` |
| **Backend** | `<backend-url>` |
| **Video Walkthrough** | `<loom-video-link>` |

---

## Features

- **Real-time stock updates**. All connected clients see inventory changes instantly via WebSocket
- **Atomic reservation**. Concurrent requests are handled at the database level; overselling is impossible
- **60-second purchase window**. Reservations expire automatically, releasing stock back to inventory
- **Activity feed**. The 3 most recent purchasers are shown per drop, updated live
- **User registration**. Enter a username to access drops; identity persists across page reloads

---

## Tech Stack

### Frontend
| | |
|---|---|
| React 19 + Vite | UI framework and build tool |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling (via `@tailwindcss/vite` plugin, no PostCSS config) |
| Socket.io Client | Real-time WebSocket events |
| Plain `useState` / `useCallback` | No external state library needed at this scale |

### Backend
| | |
|---|---|
| Node.js + Express | HTTP server |
| TypeScript + `tsx` | Runtime and type safety |
| Socket.io | WebSocket server |
| Sequelize v6 | ORM |
| Zod | Request validation |

### Infrastructure
| | |
|---|---|
| PostgreSQL (Neon) | Primary database |
| Vercel | Frontend deployment |
| Railway / Render | Backend deployment |

---

## ERD 

<a href="#"><img src="https://i.ibb.co.com/jkp2HHGF/Sneaker-Drop-Backend-ERD-drawio-2.png" alt="Sneaker Drop Backend ERD drawio (2)" border="0"></a>
---

## System Architecture

```
┌─────────────────┐
│   React Client  │  ← Vite dev server (port 5173)
└────────┬────────┘
         │  REST API  (HTTP)
         │  WebSocket (Socket.io)
         ▼
┌─────────────────┐
│ Express Server  │  ← port 5000
└────────┬────────┘
         │  Sequelize ORM
         ▼
┌─────────────────┐
│   PostgreSQL    │  ← Neon (serverless Postgres)
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Expiration Sweep Job │  ← runs every 5 seconds in-process
└────────┬────────────┘
         │  emits socket events on expiry
         ▼
┌─────────────────────┐
│  Socket.io Broadcast │
└─────────────────────┘
```

---

## Database Schema

### Users
| Column | Type |
|---|---|
| id | UUID (PK) |
| username | VARCHAR |
| createdAt | TIMESTAMP |

### Drops
| Column | Type |
|---|---|
| id | UUID (PK) |
| name | VARCHAR |
| price | DECIMAL |
| totalStock | INTEGER |
| availableStock | INTEGER |
| startsAt | TIMESTAMP |
| createdAt | TIMESTAMP |

### Reservations
| Column | Type |
|---|---|
| id | UUID (PK) |
| userId | UUID (FK → Users) |
| dropId | UUID (FK → Drops) |
| status | ENUM: `active`, `purchased`, `expired` |
| expiresAt | TIMESTAMP |
| createdAt | TIMESTAMP |

### Purchases
| Column | Type |
|---|---|
| id | UUID (PK) |
| userId | UUID (FK → Users) |
| dropId | UUID (FK → Drops) |
| reservationId | UUID (FK → Reservations) |
| createdAt | TIMESTAMP |

---

## Reservation Lifecycle

```
User clicks Reserve
        │
        ▼
   status: ACTIVE
   expiresAt: now + 60s
        │
   ┌────┴────┐
   │         │
   ▼         ▼
PURCHASED  EXPIRED (sweep job fires)
               │
               ▼
        availableStock + 1
        socket: stock:updated
```

---

## Concurrency Strategy

### The Problem

Multiple users may attempt to reserve the last available item at the same millisecond.

```
availableStock = 1
100 users click Reserve simultaneously
→ Without concurrency control: overselling occurs
```

### The Solution

Stock decrement is executed as a single atomic SQL statement — no application-level lock needed:

```sql
UPDATE "Drops"
SET "availableStock" = "availableStock" - 1
WHERE id = :dropId
  AND "availableStock" > 0;
```

If the update affects 0 rows, the item is already claimed and the request receives a `409 Conflict` immediately.

### Load Test Result

Running 100 concurrent reservation requests against a drop with `availableStock = 1`:

Run
```
npm run load-test
```

```
◇ injected env (0) from .env // tip: ⌘ custom filepath { path: '/custom/path/.env' }
Executing (default): SELECT 1+1 AS result
Executing (default): INSERT INTO "Drops" ("id","name","price","totalStock","availableStock","startsAt","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING "id","name","price","totalStock","availableStock","startsAt","createdAt","updatedAt";
Executing (default): INSERT INTO "Users" ("id","username","createdAt","updatedAt") VALUES ($1,$2,$3,$4) RETURNING "id","username","createdAt","updatedAt";
Firing 100 concurrent reserve requests at drop 2ba67c59-c076-4c62-afc1-ca44948e3a59 (stock = 1)...
Results: 1 succeeded (201), 99 rejected (409), 0 other
Executing (default): SELECT "id", "name", "price", "totalStock", "availableStock", "startsAt", "createdAt", "updatedAt" FROM "Drops" AS "Drop" WHERE "Drop"."id" = '2ba67c59-c076-4c62-afc1-ca44948e3a59';
Final availableStock in DB: 0
✅ PASS: exactly one reservation succeeded, stock correctly at 0
```


```
✓  1 request  → 201 Created  (reservation granted)
✗ 99 requests → 409 Conflict (out of stock)
```

Zero oversells. The database constraint makes this guarantee hold regardless of server concurrency, connection pool size, or network timing.

---

## Reservation Expiration

A background sweep runs every 5 seconds inside the Express process:

1. Query all `ACTIVE` reservations where `expiresAt < now`
2. Mark them `EXPIRED` in a single batch update
3. Increment `availableStock` on the affected drops
4. Emit `stock:updated` via Socket.io to all clients in the drop's room

This approach survives server restarts (state lives in Postgres, not memory) and requires no external scheduler.

---

## Real-Time Events (Socket.io)

| Event | Direction | Payload | Description |
|---|---|---|---|
| `joinDrop` | Client → Server | `{ dropId }` | Subscribe to a drop's room |
| `leaveDrop` | Client → Server | `{ dropId }` | Unsubscribe from a drop's room |
| `stock:updated` | Server → Client | `{ dropId }` | Stock count changed (reservation or expiry) |
| `purchase:completed` | Server → Client | `{ dropId, username, purchasedAt }` | A purchase was completed |

---

## API Reference

### Users

#### Register / look up user
```http
POST /api/users
Content-Type: application/json

{ "username": "alice" }
```
Returns the user record (creates if username not yet registered).

---

### Drops

#### List all drops
```http
GET /api/drops
```
Response includes `availableStock` and `recentPurchasers` (last 3, newest first).

#### Create a drop
```http
POST /api/drops
Content-Type: application/json

{
  "name": "Air Jordan 1 Retro High OG",
  "price": 250,
  "totalStock": 10,
  "startsAt": "2026-06-21T12:00:00Z"
}
```

---

### Reservations

#### Reserve an item
```http
POST /api/drops/:dropId/reserve
Content-Type: application/json

{ "userId": "<uuid>" }
```
Returns a `Reservation` with `expiresAt` 60 seconds from now. Returns `409` if out of stock.

#### Complete a purchase
```http
POST /api/reservations/:reservationId/purchase
Content-Type: application/json

{ "userId": "<uuid>" }
```
Returns `410` if the reservation has expired.

---

## Running Locally

### Prerequisites

- Node.js ≥ 20
- A PostgreSQL database (Neon free tier works fine)

---

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
PORT=5000
NODE_ENV=development
```

Run migrations, then seed demo data:

```bash
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all   # optional — seeds 5 demo users
```

Start the dev server:

```bash
npm run dev
```

Server starts on `http://localhost:5000`.

---

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

Start the dev server:

```bash
npm run dev
```

App opens on `http://localhost:5173`.

---

### Creating a drop (quick start)

With the backend running, create a drop via curl or Postman:

```bash
curl -X POST http://localhost:5000/api/drops \
  -H "Content-Type: application/json" \
  -d '{"name":"Air Jordan 1","price":250,"totalStock":5,"startsAt":"2026-01-01T00:00:00Z"}'
```

Then open `http://localhost:5173`, enter a username, and the drop appears.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string (Neon or local) |
| `PORT` | HTTP server port (default: `5000`) |
| `NODE_ENV` | `development` or `production` |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend base URL (e.g. `http://localhost:5000`) |

---

## Project Structure

```
techzu.demo/
├── backend/
│   ├── src/
│   │   ├── config/          # Sequelize config, associations, env
│   │   ├── jobs/            # Expiration sweep job
│   │   ├── middlewares/     # Error handler, request validation
│   │   ├── migrations/      # Sequelize migrations (4 tables)
│   │   ├── modules/
│   │   │   ├── drops/       # Model, controller, routes, service, schema
│   │   │   ├── reservations/
│   │   │   ├── purchases/
│   │   │   └── users/
│   │   ├── scripts/         # Seed, load test, socket test client
│   │   ├── services/        # stock.service.ts (atomic decrement)
│   │   └── socket/          # Socket.io setup and event handlers
│   ├── .sequelizerc
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── DropCard.tsx      # Per-card state machine (idle→reserving→reserved→…)
    │   │   ├── StockBadge.tsx    # Colour-coded stock indicator
    │   │   └── PurchaseFeed.tsx  # Recent purchasers list
    │   ├── hooks/
    │   │   ├── useSocket.ts      # Socket.io connection + room management
    │   │   └── useCountdown.ts   # 60s reservation countdown
    │   ├── api.ts                # Typed fetch wrappers + ApiError class
    │   ├── types.ts              # Shared TypeScript interfaces
    │   └── App.tsx               # Root: drops state, socket wiring, login screen
    └── package.json
```

---

## Future Improvements

- Redis pub/sub for horizontal WebSocket scaling across multiple backend instances
- BullMQ for durable background job processing
- JWT authentication replacing the current username-based identity
- Rate limiting per user / IP
- Distributed locking (Redlock) for reservation critical sections
- Monitoring and observability (OpenTelemetry, Sentry)
- Admin dashboard for managing drops in real time

---

## Author

**Sheikh Sakib Ahmed**. Full Stack Developer
