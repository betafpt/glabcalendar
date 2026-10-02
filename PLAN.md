# G.Lab Calendar — Product & Delivery Plan

## Goal

Build a production scheduling web app for filmmakers and photographers that gives a clear daily view of work, centralizes projects and shoots, and prevents crew/equipment double-booking.

## Current repository state

The workspace is currently empty and is not initialized as a Git repository. No application code exists yet.

## Product scope — v1

### Today Dashboard
- Today's shoots, call times, locations, and project context.
- Crew and equipment readiness summary.
- Outstanding checklist items.
- Visible scheduling conflicts and urgent warnings.

### Calendar
- Month/week/day views.
- Shoots shown as calendar events.
- Filters by project, crew member, and equipment.
- Conflict indicators.

### Projects
- Client/project metadata.
- Project status and date range.
- Related shoots, crew, equipment, and notes.

### Shoots
- Shoot date/time, location, call time, wrap estimate, status, notes.
- Assign crew and equipment.
- Per-shoot checklist.
- Conflict validation before saving assignments.

### Crew
- Crew directory with role, contact details, availability status, notes.
- Shoot assignments.
- Conflict detection when overlapping assignments are created.

### Equipment
- Equipment inventory, category, serial/asset identifier, status, notes.
- Shoot bookings.
- Conflict detection for overlapping bookings.

### Shoot checklists
- Reusable checklist items can be added later; v1 supports checklist items per shoot.
- Item completion state and optional assignee.

## Out of scope for first release

- Fully automatic two-way Google Calendar synchronization.
- AI natural-language commands.
- Push/email/SMS notifications.
- Multi-user teams and permissions.
- Client portal.
- Invoicing and finance.

The architecture must leave clean integration points for the first four items.

## Delivery milestones

### Milestone 0 — Foundation
- Initialize Next.js + React + TypeScript + Tailwind.
- Add linting, formatting, typecheck, test, and build commands.
- Establish folder structure and environment configuration.
- Add database layer and migrations.

### Milestone 1 — Core domain
- Projects CRUD.
- Shoots CRUD.
- Crew CRUD.
- Equipment CRUD.
- Database-level relationships and validation.

### Milestone 2 — Scheduling engine
- Crew assignment to shoots.
- Equipment booking to shoots.
- Overlap/conflict query layer.
- Conflict result types usable by UI and future APIs.

### Milestone 3 — Calendar and Today Dashboard
- Calendar data query.
- Day/week/month UI.
- Today Dashboard query and UI.
- Conflict badges and status summaries.

### Milestone 4 — Shoot workflow
- Shoot detail screen.
- Checklist CRUD and completion.
- Crew/equipment assignment UX.
- Final pre-shoot readiness summary.

### Milestone 5 — Production hardening
- Error/empty/loading states.
- Responsive UI.
- Accessibility pass.
- Seed/demo data.
- Test coverage for conflict logic and critical flows.
- Lint, typecheck, tests, production build.

## Acceptance strategy

Every implementation task is accepted only when:
- Its stated acceptance criteria are satisfied.
- TypeScript typecheck passes for affected code.
- Relevant tests pass.
- Lint passes for affected code.
- Production build remains green when the task can affect build output.
- No regression is introduced into previously accepted behavior.

## Future-ready extension points

- `calendar_integrations`: provider connection metadata and sync cursors.
- Automatic Google Calendar two-way sync:
  - G.Lab -> Google is already triggered automatically when a shoot is created or updated.
  - Google -> G.Lab currently requires `syncAll()` / the "ĐỒNG BỘ NGAY" action.
  - Planned follow-up: add Google Calendar push notifications (`events.watch` webhook/channel) for near-real-time inbound sync.
  - Add channel lifecycle handling: create/renew/expire/revoke watch channels, validate notification headers, and persist channel metadata.
  - Webhook should only enqueue/trigger reconciliation; `nextSyncToken` remains the authoritative incremental pull mechanism.
  - Keep the existing idempotency/hash logic and conflict rules to prevent sync loops and duplicate events.
  - Add Vercel Cron as a fallback/recovery sync for missed webhooks and channel renewal.
- Domain events/outbox: source for notifications and external sync.
- Command/application service layer: future AI commands call the same use cases as the UI.
- `organizations` + memberships: future multi-user/team tenancy.
- Notification preferences and delivery adapters can subscribe to domain events later.

## Implementation ownership

- Codex: architecture, planning, task definition, review, QA, acceptance decisions, and non-UI logic/backend work when needed.
- Gemini: primary implementation owner for all UI/UX work, including layout, styling, visual polish, responsive behavior, interaction presentation, and UI localization fixes. Codex should delegate UI changes to Gemini first, then review and verify the result.
