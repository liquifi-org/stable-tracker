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

## ✍️ Author

Pedro
