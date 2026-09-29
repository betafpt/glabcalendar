# Database Layer (`src/server/db`)

Database client initialization, ORM schema definitions, migrations, and repositories for G.Lab Calendar.

## ORM & Driver Baseline

- **ORM**: Drizzle ORM (`drizzle-orm`)
- **Driver**: Postgres.js (`postgres`)
- **Migrations & CLI Tooling**: Drizzle Kit (`drizzle-kit`)

## Architecture & Responsibilities

- **Server-Only Database Client (`src/server/db/index.ts`)**:
  - Enforces a runtime guard preventing import or execution within client-side browser bundles.
  - Uses the typed environment validation in `@/lib/config` (`getServerConfig().databaseUrl`) to fail fast on invalid or missing configurations.
  - Implements a global singleton pattern (`globalThis.conn`) to prevent connection pool exhaustion during Next.js Hot Module Replacement (HMR) development reloads.
  - Exports `db`, `conn`, `client`, and schema bindings for server components, server actions, and repositories.

- **Schema Foundation (`src/server/db/schema.ts`)**:
  - Central schema definition export for Drizzle ORM.
  - Intentionally empty foundation placeholder in M0-T05; business entities (starting with `organizations` tenancy boundary) are deferred to M0-T06 and Milestone 1.

- **Migration Root Configuration (`drizzle.config.ts`)**:
  - Configured at project root targeting `schema: "./src/server/db/schema.ts"` and `out: "./drizzle"`.
  - Reads `DATABASE_URL` through the existing typed server config with a safe fallback for offline migration artifact generation.

## Local Development Setup

### 1. PostgreSQL Database Service

Start a local PostgreSQL instance (e.g., using Docker):

```bash
docker run -d \
  --name glab-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=glab_dev \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Environment Configuration

Define `DATABASE_URL` in `.env.local` (or server environment):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/glab_dev"
APP_TIMEZONE="Asia/Ho_Chi_Minh"
```

## Migration Workflow

Manage migrations using the scripts declared in `package.json`:

- **Generate Migrations**:
  ```bash
  npm run db:generate
  ```
  Compares schema definitions in `src/server/db/schema.ts` against previous migration snapshots and generates new SQL files in `./drizzle`.

- **Apply Migrations**:
  ```bash
  npm run db:migrate
  ```
  Applies all pending migrations in `./drizzle` to the target database.

- **Push Schema (Prototyping)**:
  ```bash
  npm run db:push
  ```
  Synchronizes schema directly to the database without generating migration files.

- **Drizzle Studio**:
  ```bash
  npm run db:studio
  ```
  Opens Drizzle Studio in the browser to browse and inspect database tables.
