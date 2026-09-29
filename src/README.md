# Source Architecture

This directory contains the application source code structured as a modular monolith adhering to `ARCHITECTURE.md`.

## Directory Layout

- `app/` — Next.js App Router routes, layouts, server actions, and route handlers.
- `components/` — Shared presentational UI components.
- `features/` — Domain-specific UI features (dashboard, calendar, projects, shoots, crew, equipment, checklists).
- `domain/` — Pure business logic, scheduling rules, and core domain types (zero external dependencies).
- `server/` — Infrastructure and server application layer:
  - `db/` — Database client, schema, migrations, and repositories.
  - `services/` — Application services and use case orchestration.
  - `integrations/` — External service adapters (e.g., Google Calendar, notifications).
- `lib/` — Shared utilities, helpers, and validation schemas.

## Dependency Rules

1. **Domain Layer (`domain/`)**: Pure domain rules (e.g. scheduling interval overlap). Must not import from `server/`, `features/`, `components/`, `app/`, or any framework/database.
2. **Server Layer (`server/`)**: Contains application services and database access. Repositories must be organization-scoped (`organization_id`).
3. **UI Layers (`app/`, `features/`, `components/`)**:
   - `components/` contains pure reusable presentational UI.
   - `features/` contains feature-specific UI and hooks.
   - `app/` handles routing and coordinates with application services (`server/services/`). UI must not implement scheduling conflict logic directly.
