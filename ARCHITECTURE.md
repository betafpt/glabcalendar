# G.Lab Calendar — Architecture

## Technology baseline

- Next.js (App Router)
- React
- TypeScript with strict mode
- Tailwind CSS
- PostgreSQL
- ORM/query layer: Prisma or Drizzle; choose one during foundation setup and use it consistently.
- Validation: Zod at application boundaries.
- Test runner: Vitest for unit/domain tests; Playwright can be added for critical end-to-end flows.

## Architectural style

Use a modular monolith. Keep UI, application use cases, domain logic, and infrastructure clearly separated so the app can grow without introducing service complexity too early.

Suggested structure:

```text
src/
  app/                  # Next.js routes, layouts, server actions / route handlers
  components/           # shared presentational UI
  features/
    dashboard/
    calendar/
    projects/
    shoots/
    crew/
    equipment/
    checklists/
  domain/
    scheduling/         # overlap/conflict rules and pure domain types
  server/
    db/                 # database client, schema, repositories
    services/           # application use cases
    integrations/       # future Google Calendar / notification adapters
  lib/                  # shared utilities and validation helpers
```

## Layer responsibilities

### UI / route layer
- Render screens and collect user input.
- Perform schema validation at boundaries.
- Call application services/use cases.
- Must not implement scheduling rules directly.

### Application service layer
- Orchestrates use cases such as creating a shoot or assigning equipment.
- Calls repositories and scheduling conflict services.
- Returns typed results suitable for UI, future APIs, and AI commands.

### Domain layer
- Pure scheduling rules.
- Time-overlap logic.
- Crew/equipment conflict result types.
- No framework, database, or UI dependencies.

### Infrastructure layer
- Database repositories.
- External integration adapters.
- Notification delivery adapters later.

## Scheduling model

Treat a shoot as the scheduling boundary. Each shoot has a `starts_at` and `ends_at` timestamp.

Canonical overlap rule for two intervals `[A_start, A_end)` and `[B_start, B_end)`:

```text
A_start < B_end AND B_start < A_end
```

This allows one booking to end exactly when another begins.

Conflict checks must run in the application service before an assignment/booking is persisted. The database should also enforce uniqueness constraints where possible, while temporal overlap validation remains explicit in the scheduling service.

## Server interaction pattern

- Prefer Server Components for data-heavy read screens.
- Use Server Actions or Route Handlers for mutations.
- All mutations call application services rather than directly mutating tables.
- Client Components are limited to interactions needing browser state.

## Future Google Calendar sync

Add an adapter behind an interface such as:

```ts
interface CalendarProvider {
  pushShoot(...): Promise<void>
  deleteShoot(...): Promise<void>
  pullChanges(...): Promise<CalendarChange[]>
}
```

Persist provider IDs and sync metadata separately from core shoot data. Do not put Google-specific fields into the core scheduling domain.

## Future AI commands

AI should translate natural language into validated commands such as:

- `CreateShootCommand`
- `AssignCrewCommand`
- `BookEquipmentCommand`
- `CompleteChecklistItemCommand`

These commands call the same application services used by the UI. AI never bypasses scheduling validation.

## Future notifications

Introduce domain/application events, preferably persisted through an outbox table. Events such as `shoot.created`, `shoot.updated`, `crew.assigned`, and `conflict.detected` can later feed email, push, or messaging adapters.

## Future multi-user teams

Design primary business tables with an `organization_id` boundary from the beginning, even if v1 runs as a single organization. Add users/memberships later without rewriting every query.

All repository queries must be organization-scoped once authentication is introduced.

## Error model

Application services return typed domain errors, for example:

- `NOT_FOUND`
- `VALIDATION_ERROR`
- `CREW_SCHEDULING_CONFLICT`
- `EQUIPMENT_BOOKING_CONFLICT`

UI maps these to human-readable messages. This same model can later be reused by APIs and AI tooling.

## Time handling

- Store timestamps in UTC.
- Store an organization timezone setting.
- Convert to the organization/user timezone for display.
- Never compare formatted local date strings for conflict detection.

## Quality gates

- Strict TypeScript.
- Deterministic unit tests for overlap/conflict logic.
- Integration tests for assignment/booking persistence.
- Critical workflow E2E tests after the flows stabilize.
- Required scripts: `lint`, `typecheck`, `test`, `build`.
