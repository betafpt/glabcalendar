# Server Layer (`src/server`)

Server-side application services, data access infrastructure, and third-party integrations.

## Subdirectories

- `db/` — Database client, schema models, migrations, and repositories.
- `services/` — Application service use cases orchestrating domain rules and persistence.
- `integrations/` — External adapters (e.g. Google Calendar synchronization, notifications).

## Boundary Rules

- All database access must be organization-scoped (`organization_id`).
- Route handlers and server actions call `services/` rather than querying `db/` directly.
