# 🚀 ts-backend-production-template

A robust, production-ready backend template for Node.js using TypeScript and Express.  
Includes best practices for code quality, error handling, logging, and developer experience.

---

## 📦 Features

- TypeScript with strict settings and type-checked ESLint (typescript-eslint recommendedTypeChecked).
- Source maps enabled for easier debugging.
- Express 5 with modular routing and middlewares.
- Centralized error handling and consistent HTTP responses.
- Not Found (404) and Method Not Allowed (405) helpers.
- Winston logging (ready for console/file/MongoDB transports).
- Mongoose ready (optional MongoDB integration).
- ESLint + Prettier integration.
- Husky + lint-staged + Commitlint ready for conventional commits.
- Nodemon for hot reload in development.
- Health endpoint 
- Database migration support 
- Enabled Helmet to enhance API security with HTTP headers.
- CORS configuration with whitelisted origins, methods, and credentials.
- Rate limiting: Per-IP middleware with configurable limits, backed by MongoDB datastore.
- Runs anywhere: Fully containerized with Docker, also supports local development.
- Environment variables via `.env` files using Node.js native support (`--env-file` flag, no extra packages needed).
- **Stablecoin adoption pipeline**: per-country active wallets via the **Allium Explorer API** (async run/poll) stored as monthly historical snapshots, population via the **World Bank Open Data API**, exposed through `/v1/analytics/adoption` and a token-protected admin sync API. See [Stablecoin Adoption](#-stablecoin-adoption-population--active-wallets).

---

## 📑 Table of Contents

- [Features](#-features)
- [Project Structure](#️-project-structure)
- [Environment Variables](#️-environment-variables)
- [Development](#-development)
- [Migrations (MongoDB + Mongoose)](#migrations-mongodb--mongoose)
- [Conventions](#-conventions)
- [Stablecoin Adoption (population %, active wallets)](#-stablecoin-adoption-population--active-wallets)
  - [Allium integration (active wallets)](#-allium-integration-active-wallets)
  - [World Bank integration (population)](#-world-bank-integration-population)
  - [Analytics endpoints](#-analytics-endpoints)
  - [Admin sync endpoints ("Plan B")](#-admin-sync-endpoints-plan-b)
  - [Environment variables (adoption feature)](#-environment-variables-adoption-feature)
  - [Scheduling (cron)](#️-scheduling-cron)
  - [Files added for this feature](#-files-added-for-this-feature)

---

## 🗂️ Project Structure
```
api/
  src/
    app.ts                     # App wiring: JSON parsing, routers, 404 handler, global error handler
    server.ts                  # Server bootstrap
    router/
      apiRouter.ts             # API routes (/api)
    controller/
      apiController.ts         # Example controller (GET /api/self)
    middleware/
      globalErrorHandler.ts    # Global error handler (final middleware)
    util/
      colorUtil.ts             # Color utilities for log levels (console)
      envUtil.ts               # Environment validation helpers (type guards)
      healthUtil.ts            # Gathers system & application health metrics
      logger.ts                # Winston logger (referenced by errorObject)
      httpError.ts             # Helper to build/pass HttpError via next()
      errorObject.ts           # Builds the HttpError object (privacy-aware)
      httpResponse.ts          # Standard success response helper
      responseObject.ts        # Builds the HttpResponse object (logs + prod privacy)
      notFoundError.ts         # Route/entity 404 helpers
      methodNotAllowedError.ts # 405 helper for route.all()
    constant/
      responseMessage.ts       # Centralized response messages
      application.ts           # Application constants (e.g. environment)
    config/
      config.ts                # App configuration (reads env vars)
    model/                     # (Ready for Mongoose models)
    service/                   # (Business logic)
  .env.example
  package.json
  tsconfig.json
  eslint.config.mjs
  README.md
```

---


## ⚙️ Environment Variables

Copy the example and adjust values:

```bash
```bash
# For development environment
cp .env.example .env.development

# For production environment
cp .env.example .env.production
```
```

Example variables (from .env.example):
```
PORT=3003
SERVER_URL=http://localhost
ENV=development
LOG_LEVEL=info
```

Notes:
- For production, create a `.env.production` file.
- For development, create a `.env.development` file and use `npm run dev` .

---

## 🧑‍💻 Development

Install dependencies:
```bash
npm install
```

Run in development (hot reload with Nodemon):
```bash
npm run dev
```

Build TypeScript to dist/:
```bash
npm run build
```

Run in production (requires .env.production):
```bash
npm start
```

---
## Migrations (MongoDB + Mongoose)

The migration system lets you:
- Create structures or indexes
- Seed initial data
- Revert applied changes (down)
- Prune obsolete registrations

### Available scripts

- Development: `npm run migrate:dev <command> [args]`
- Production: `npm run migrate:prod <command> [args]`

`MIGRATE_MODE` is injected by the npm script to select the environment.

If mode is set, it will look for .env.[mode] file in the root of your project
For example, if MIGRATE_MODE=development it will look for .env.development file
If mode is not set, it will look for .env file in the root of your project
```text

.env                # loaded in all cases
.env.local          # loaded in all cases (used as override for local development)
.env.[mode]         # only loaded in specified mode
.env.[mode].local   # only loaded in specified mode (used as override for local development)
```

### Core commands

1. Create a new migration  
   ```bash
   npm run migrate:dev create seed-users
   ```
   This generates a file like:  
   `migrations/<timestamp>-seed-users.ts`  
   Example: `migrations/20240101121530-seed-users.ts`

2. Edit the migration (seed example)
   ```typescript
   // migrations/<timestamp>-seed-users.ts
   import databaseService from '../src/service/databaseService';
   import { UserModel } from '../src/model/user.model';

   const seedUsers = [
     { email: 'john@example.com', favouriteSport: 'surf', yearOfBirth: 1997 },
     { email: 'alice@example.com', favouriteSport: 'soccer', yearOfBirth: 1998 },
   ];

   export async function up(): Promise<void> {
     await databaseService.connect();
     await UserModel.create(seedUsers);
   }

   export async function down(): Promise<void> {
     await databaseService.connect();
     await UserModel.deleteMany({
       email: { $in: seedUsers.map(u => u.email) },
     });
   }
   ```

3. Apply (run) migrations  
   ```bash
   # Run all pending
   npm run migrate:dev up

   # Run only one (match suffix after timestamp)
   npm run migrate:dev up seed-users
   ```

4. Revert migrations  
   ```bash
   # Revert last applied
   npm run migrate:dev down

   # Revert a specific one
   npm run migrate:dev down seed-users
   ```

### Additional commands

- List status:
  ```bash
  npm run migrate:dev list
  ```
  Shows applied (up) and pending (down) migrations.

- Delete extraneous migrations from migration folder or database:
  ```bash
  npm run migrate:dev prune
  ```

### Production usage

Replace `migrate:dev` with `migrate:prod`:
```bash
npm run migrate:prod up
npm run migrate:prod down
npm run migrate:prod list
npm run migrate:prod prune
```

Ensure:
- Correct env vars (`DB_URL`, `ENV=production`)

### Recommendations

- One migration = one clear purpose
- Avoid destructive data ops without a safe `down`
- Never edit an applied production migration: create a new one

---


## 🧭 Conventions

- Conventional Commits (Commitlint).
- Prettier for formatting.
- ESLint for code quality with type-aware rules.

---

## 🌍 Stablecoin Adoption (population %, active wallets)

This section documents the **adoption feature**: the main metric of the adoption
map is the **percentage of a country's population that uses stablecoins**, and on
hover the UI shows a breakdown including the **number of active wallets holding
stablecoins** per country.

To compute this we combine two external data sources:

| Data | Source | Frequency | Where it lands |
| --- | --- | --- | --- |
| Wallets holding stablecoins per country | **Allium Explorer API** | Monthly | `walletcountsnapshots` collection (historical) |
| Population per country | **World Bank Open Data API** | Yearly | `population` field on each `countries` doc |

`adoptionRate = walletsHoldingStablecoins / population`.

### Country identifiers

All countries are keyed internally by their **ISO 3166-1 numeric** code, zero-padded
to 3 chars (e.g. `"840"` = United States, `"724"` = Spain). External sources use
different representations (alpha-2, alpha-3, name), so everything is normalised to
the numeric id via `script/shared/iso3166.ts` → `resolveCountryId()`.

> Endpoints that take a `countryId` (path or query) expect the **numeric** code
> (`840`), **not** alpha-2 (`US`).

---

### 🔗 Allium integration (active wallets)

Scripts live in `script/allium/`:

- `_client.ts` — shared Allium Explorer API client (config, types, async-run helpers).
- `sync-wallets.ts` — fetches the per-country wallet counts and stores a monthly snapshot.

#### Why it's asynchronous

Allium Explorer queries do **not** return data synchronously. The flow is:

1. `POST /explorer/queries/{queryId}/run-async` → returns `{ run_id }`.
2. `GET  /explorer/query-runs/{runId}/status` → poll until status is `success`
   (or `failed` / `canceled`).
3. `POST /explorer/query-runs/{runId}/results` → returns `{ data: [...] }`.

`runAndWait()` in `_client.ts` wraps these three steps: it triggers the run, polls
every `POLL_INTERVAL_MS` (5s) up to `MAX_POLLS` (120 → ~10 min), and returns the rows.

#### Getting the API key

Allium → **Queries** → open any query → **Run via API** → copy the **API Key**.
Set it as `ALLIUM_API_KEY`. The query that returns wallet counts per country is
identified by `ALLIUM_WALLETS_QUERY_ID` (defaults to `o0VH4UGyeKr55L34qxPG`).

#### Column auto-detection

The Allium query columns may change names. `sync-wallets.ts` auto-detects the
country and wallet-count columns from a list of candidates (`COUNTRY_KEYS`,
`WALLET_COUNT_KEYS`, plus optional `total_geo_wallets` / `pct_holding_stablecoins`).
If detection fails it logs the columns it found so they can be added to the lists.

#### Historical snapshots (never overwrite)

Allium returns the wallet count "as of today". To track adoption over time we store
**one document per `(countryId, period)`** in `walletcountsnapshots`, where `period`
is a `"YYYY-MM"` key. A **unique index on `(countryId, period)`** guarantees:

- Older monthly snapshots are **preserved** (history is never overwritten).
- Re-running within the same month is **idempotent** (an upsert updates that month's
  row instead of duplicating it).

Document shape (`WalletCountSnapshotModel`):

```jsonc
{
  "countryId": "840",
  "period": "2026-06",
  "walletCount": 62017,
  "totalWallets": 1234567,          // optional, if the query provides it
  "pctHoldingStablecoins": 5.02,    // optional, if the query provides it
  "snapshotDate": "2026-06-10T...",
  "source": "allium",
  "syncedAt": "2026-06-10T..."
}
```

#### Run it manually

```bash
# Uses DB_URL from .env.development
npm run allium:sync:wallets

# Force local Mongo (mongodb://localhost:27017/sc-tracker)
npm run allium:sync:wallets:local
```

In practice this runs **monthly** via cron (or the admin endpoint below).

---

### 👥 World Bank integration (population)

Script: `script/general/sync-population.ts`.

**Source:** [World Bank Open Data](https://data.worldbank.org/) — indicator
**`SP.POP.TOTL`** (total population). It is **free and needs no API key**, which is
why it was chosen over a scraper.

Request used:

```
https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&mrnev=1&per_page=400
```

- `country/all` → all countries.
- `mrnev=1` → *most recent non-empty value* per country (we only want the latest figure).
- `per_page=400` → everything in a single page.

The World Bank response is `[metadata, dataEntries]`, so the script reads `body[1]`.
Each entry is keyed by **ISO alpha-3** (`USA`), resolved to our numeric id with
`resolveCountryId()`. Regional aggregates (e.g. "World", "Euro area") don't resolve
and are skipped automatically. Values are upserted onto the `countries` docs with
`upsert: false` (it only updates already-seeded countries, never creates new ones):

```jsonc
{
  "population": 331000000,
  "populationYear": 2024,
  "populationSyncedAt": "2026-06-10T..."
}
```

#### Run it manually

```bash
npm run population:sync
npm run population:sync:local
```

Population changes slowly, so this is meant to run **yearly**.

> **Known limitation:** the World Bank does not report some territories (e.g. Taiwan),
> so those countries end up without `population` and their `adoptionRate` is `0`.

---

### 📊 Analytics endpoints

Base path: `/v1`. The adoption data is exposed through the analytics API.

#### `GET /v1/analytics/adoption` — adoption heatmap

Returns one row per country with the headline metric and the active-wallet count.

Query params: `year` (required), `month`, `referenceAsset`, `stablecoinId`,
`countryId` (numeric or `All`), `region`.

```bash
curl "http://localhost:3003/v1/analytics/adoption?year=2026&month=6"
```

```jsonc
[
  {
    "countryId": "840",
    "name": "United States",
    "region": "North America",
    "adoptionRate": 0.000182,   // walletsHoldingStablecoins / population
    "activeWallets": 62017,     // from the latest Allium snapshot
    "txValueShare": 0,
    "unit": "ratio"
  }
]
```

How it's computed (`MongoAnalyticsRepository.getAdoptionMetrics`):
- `activeWallets` = latest Allium snapshot with `period <= target` (falls back to a
  live `WalletModel` count when a country has no snapshot yet).
- `adoptionRate` = `activeWallets / country.population` (0 if population is missing).

#### `GET /v1/analytics/countries/{countryId}/overview` — hover breakdown

Detailed per-country view used when hovering a country on the map.

```bash
curl "http://localhost:3003/v1/analytics/countries/840/overview?year=2026&month=6"
```

Includes `adoptionRate`, `activeWallets`, `txValueShare`, `dollarizationIndex`,
plus compliant issuers, licenses and reserve types.

---

### 🔐 Admin sync endpoints ("Plan B")

Besides the CLI scripts / cron, the same syncs can be triggered over HTTP through a
**private, token-protected** API. Useful when there is no shell access to run the
scripts. These run the exact same routines and reuse the server's live Mongo connection.

Routes (`/v1/admin`), all `POST`:

| Endpoint | Action |
| --- | --- |
| `/v1/admin/sync/all` | Population + Allium wallets (Allium skipped if no API key) |
| `/v1/admin/sync/wallets` | Allium wallet counts only |
| `/v1/admin/sync/population` | World Bank population only |

**Authentication:** send the secret token in the `x-admin-token` header (or
`Authorization: Bearer <token>`). It must match `ADMIN_SYNC_TOKEN` configured on the
server. The guard (`adminAuth` middleware) **fails closed**: if `ADMIN_SYNC_TOKEN` is
not set, every request is rejected (403). The comparison is constant-time.

```bash
curl -X POST \
  -H "x-admin-token: <ADMIN_SYNC_TOKEN>" \
  http://localhost:3003/v1/admin/sync/all
```

> ⚠️ The Allium step is asynchronous and can take ~1–2 minutes, so the HTTP request
> stays open until the run finishes.

---

### 🔧 Environment variables (adoption feature)

Add these to `.env.development` / `.env.production`:

```dotenv
# Allium Explorer API (wallet counts per country)
ALLIUM_API_KEY=<your-allium-api-key>
ALLIUM_WALLETS_QUERY_ID=o0VH4UGyeKr55L34qxPG

# Private admin sync endpoints (Plan B). Leave empty to disable (fails closed).
ADMIN_SYNC_TOKEN=<a-strong-secret>
```

The World Bank API needs no key. `DB_URL` (already used by the app) is reused by the
scripts as the Mongo connection string.

---

### 🗓️ Scheduling (cron)

Recommended cadence:

| Script | Suggested schedule | npm script |
| --- | --- | --- |
| Allium wallets | Monthly | `npm run allium:sync:wallets` |
| Population | Yearly | `npm run population:sync` |

Example crontab entries (run from the project root):

```cron
# Allium wallet counts — 03:00 on the 1st of every month
0 3 1 * * cd /path/to/stable-tracker-backend && npm run allium:sync:wallets >> logs/allium.log 2>&1

# Population — 04:00 on Jan 1st
0 4 1 1 * cd /path/to/stable-tracker-backend && npm run population:sync >> logs/population.log 2>&1
```

Alternatively, hit the admin endpoints from any external scheduler.

---

### 📁 Files added for this feature

```
script/
  allium/
    _client.ts                 # Allium Explorer API client (async run/poll/results)
    sync-wallets.ts            # Monthly per-country wallet snapshots
  general/
    sync-population.ts         # Yearly population from the World Bank
  shared/
    iso3166.ts                 # ISO 3166-1 reference + resolveCountryId()
src/
  infrastructure/database/mongoose/models/
    WalletCountSnapshotModel.ts        # Historical monthly snapshots
  interfaces/http/
    controllers/AdminController.ts     # Plan B sync handlers
    middleware/adminAuth.ts            # Token guard (fails closed)
    routes/adminRoutes.ts              # /v1/admin routes
```

---

## ✍️ Author

Pedro
