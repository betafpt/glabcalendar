# Feature Modules (`src/features`)

Feature-scoped UI components, state management, and display logic organized by business capability.

## Subdirectories

- `dashboard/` — Today Dashboard, schedule summaries, and readiness views.
- `calendar/` — Calendar month, week, day views, and view filters.
- `projects/` — Project listing, creation, and detail interfaces.
- `shoots/` — Shoot listing, detail, and timeline interfaces.
- `crew/` — Crew management, availability, and assignment interfaces.
- `equipment/` — Equipment inventory, booking, and conflict interfaces.
- `checklists/` — Shoot readiness checklists and task completion interfaces.

## Boundary Rules

- Features consume application services and shared domain types.
- Feature components must not execute ad-hoc scheduling conflict checks; all invariants are validated via domain and application services.
