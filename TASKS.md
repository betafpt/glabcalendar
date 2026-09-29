# G.Lab Calendar — Implementation Tasks

Each task is intentionally small so Gemini can implement one task at a time and Codex can review/accept it independently.

## Milestone 0 — Foundation

### M0-T01 — Initialize the application shell

**Implementation agent:** Gemini

Create a Next.js application in the existing workspace using App Router, React, TypeScript strict mode, and Tailwind CSS.

Required outcomes:
- App runs locally.
- `src/` layout is used.
- TypeScript strict mode enabled.
- Tailwind configured and a minimal root page renders.
- Scripts exist for `dev`, `lint`, `typecheck`, and `build`.
- No product feature implementation yet.

Acceptance criteria:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.
- Root page renders without runtime error.

### M0-T02 — Add test infrastructure
- Add Vitest and minimal configuration.
- Add `npm test` (or `npm run test`) script.
- Add one meaningful smoke test for a pure utility/config boundary, avoiding tests that merely mirror implementation.

### M0-T03 — Establish source architecture
- Create the top-level module folders from `ARCHITECTURE.md`.
- Add path aliases where useful.
- Add short module boundary documentation.

### M0-T04 — Add environment validation
- Add typed environment parsing using Zod.
- Support database URL and application timezone defaults.
- Fail fast on invalid server configuration.

### M0-T05 — Add PostgreSQL ORM foundation
- Choose Prisma or Drizzle.
- Add database client, migration workflow, and local/dev configuration documentation.
- No business tables beyond organization bootstrap in this task.

### M0-T06 — Create initial organization schema
- Implement `organizations` table.
- Add migration.
- Add repository access needed to read/create the initial organization.

## Milestone 1 — Core domain

### M1-T01 — Projects schema and repository
### M1-T02 — Projects application service
### M1-T03 — Projects list/create UI
### M1-T04 — Projects detail/edit UI
### M1-T05 — Shoots schema and repository
### M1-T06 — Shoot validation and application service
### M1-T07 — Shoots list/create UI
### M1-T08 — Shoot detail/edit UI
### M1-T09 — Crew schema and repository
### M1-T10 — Crew application service
### M1-T11 — Crew list/create/edit UI
### M1-T12 — Equipment schema and repository
### M1-T13 — Equipment application service
### M1-T14 — Equipment list/create/edit UI

## Milestone 2 — Scheduling engine

### M2-T01 — Pure interval overlap utility
- Implement canonical half-open interval overlap logic.
- Unit-test adjacent, nested, identical, partial-overlap, and non-overlap cases.

### M2-T02 — Crew assignment schema/repository
### M2-T03 — Crew conflict query
### M2-T04 — Crew assignment application service
### M2-T05 — Crew assignment UI
### M2-T06 — Equipment booking schema/repository
### M2-T07 — Equipment conflict query
### M2-T08 — Equipment booking application service
### M2-T09 — Equipment booking UI
### M2-T10 — Unified conflict presentation component

Acceptance focus for Milestone 2:
- Overlapping active shoot assignments are rejected with typed conflict details.
- Adjacent shoots are allowed.
- Cancelled shoots do not block a resource.
- Editing a shoot does not conflict with itself.

## Milestone 3 — Calendar and Today Dashboard

### M3-T01 — Calendar query model
### M3-T02 — Calendar month view
### M3-T03 — Calendar week/day views
### M3-T04 — Calendar filters
### M3-T05 — Today Dashboard query model
### M3-T06 — Today Dashboard UI
### M3-T07 — Dashboard conflict/readiness summaries

## Milestone 4 — Shoot workflow

### M4-T01 — Checklist schema/repository
### M4-T02 — Checklist application service
### M4-T03 — Checklist UI on shoot detail
### M4-T04 — Checklist completion interaction
### M4-T05 — Shoot readiness summary

## Milestone 5 — Production hardening

### M5-T01 — Loading, empty, and error states
### M5-T02 — Responsive layout pass
### M5-T03 — Accessibility review/fixes
### M5-T04 — Seed/demo dataset
### M5-T05 — Critical integration tests
### M5-T06 — Critical Playwright flow tests
### M5-T07 — Final lint/typecheck/test/build review

## Review workflow for every Gemini task

1. Gemini implements only the assigned task.
2. Codex inspects the diff against the task acceptance criteria.
3. Codex runs the relevant tests plus lint/typecheck/build as appropriate.
4. Codex either marks the task accepted or returns precise implementation corrections.
5. Only after acceptance does work advance to the next task.

## First implementation task

**M0-T01 — Initialize the application shell.**

Gemini should create the Next.js + React + TypeScript + Tailwind foundation only, with strict TypeScript and working `dev`, `lint`, `typecheck`, and `build` scripts. Do not implement Projects, Shoots, Calendar, Crew, Equipment, checklists, authentication, database schema, or integrations in this task.
