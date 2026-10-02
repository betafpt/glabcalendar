# G.Lab Calendar — Fast-track Execution Plan

This is the authoritative roadmap for getting the app live quickly. The old micro-task roadmap remains in `TASKS.atomic.md` only as historical reference.

## Operating model

- Gemini is the primary implementation engine. Codex leads architecture, scopes each run, reviews diffs, runs QA, and rejects regressions.
- For every UI/UX change, Gemini is the default implementation owner. This includes layout, styling, responsive behavior, component presentation, interaction polish, visual consistency, and user-facing localization. Codex coordinates, reviews, tests, and handles supporting logic/backend changes when required.
- Optimize for end-to-end outcomes, not small tickets. Each task below is a large vertical slice that Gemini should complete in one run unless a real blocker appears.
- Preserve unrelated work already in the repository.
- Google Calendar Sync is part of the go-live critical path.
- AI stays in the product plan but begins only after production is live and the core app has been validated.

## LIVE-01 — Make the core app production-complete

Goal: finish everything required for a real user to sign in and use the scheduling app end-to-end without dead ends.

Gemini owns in one implementation run:
- Finish/repair Auth.js Google login and protected routes.
- Finish Drizzle auth schema/migrations and production environment validation.
- Verify the complete user journey: Dashboard → Projects → Shoots → Crew/Equipment → assignments → conflicts → checklist/readiness → Calendar.
- Fix broken CRUD/actions, dead buttons, route/navigation failures, loading/error/empty states encountered in that journey.
- Keep desktop/mobile responsive behavior and the current G.Lab visual system.
- Update only the meaningful integration/E2E tests needed to prove that journey.

Release gate:
- Core journey works end-to-end.
- Conflict rules still allow adjacent bookings and reject overlapping active bookings.
- Auth and migration paths are internally consistent.
- `npm run lint`, `npm run typecheck`, `npm run test`, critical Playwright flow, and `npm run build` pass.

## LIVE-02 — Google Calendar Sync end-to-end

Goal: make Google Calendar a reliable production feature before launch.

Gemini owns in one implementation run:
- Connect/disconnect Google Calendar from the existing Integrations UI using minimum required scopes.
- Persist provider connection, selected calendar, token/sync metadata, external event IDs, and sync cursors/state safely.
- Sync G.Lab shoots to Google Calendar for create/update/cancel without duplicates.
- Reconcile relevant Google Calendar changes back into the app with an explicit source-of-truth/conflict rule.
- Make all sync operations idempotent and retry-safe.
- Handle expired/revoked credentials, provider/API errors, and reconnection cleanly.
- Surface connection state, last sync, manual retry/sync action, and actionable errors in UI.
- Add provider-boundary tests and one critical integration/E2E sync flow where practical.

Release gate:
- Repeated sync produces no duplicates.
- Create/update/cancel behavior is deterministic.
- Token revoke/expiry and provider failure paths do not break the app.
- `npm run lint`, `npm run typecheck`, `npm run test`, relevant E2E, and `npm run build` pass.

## LIVE-03 — Ship-ready QA and deployment package

Goal: remove launch blockers and leave the project ready for staging, then production.

Gemini owns in one implementation run:
- Perform final responsive/accessibility/loading/error-state cleanup on critical routes.
- Remove demo/test assumptions from production behavior.
- Verify clean migration order and startup against a fresh database path.
- Clean/quarantine generated test artifacts and tighten `.gitignore` where needed.
- Run full regression and fix application failures found by QA.
- Produce `GO_LIVE_CHECKLIST.md` containing only external steps that truly require owner credentials/provider/domain/deployment access.

Release gate:
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run build`
- No known P0/P1 blocker remains.

## RELEASE — Staging → production

Codex performs the final release gate in the original workspace after LIVE-01..LIVE-03 are accepted. External actions requiring credentials or account ownership happen here: production PostgreSQL provisioning, Google OAuth/Calendar configuration, production secrets, staging deployment, live smoke test, domain/callback setup, then production release.

## POST-LIVE-01 — AI Assistant

Starts only after the released app and Google Calendar sync have been validated in production.

Goal:
- Keep the existing AI UI/product direction.
- Implement read-only schedule/readiness/conflict/project assistance first.
- Route every AI action through the same application-service layer and validation rules as the normal UI.
- Add mutations only after read-only behavior is proven stable.

## Execution order

`LIVE-01 → LIVE-02 → LIVE-03 → staging → production → production validation → POST-LIVE-01`

## QA-UI-01 — Consolidated real-browser interaction sweep

Goal: keep every browser-visible defect from the current UI audit in one task until the complete interactive surface has been verified.

Current status (2026-10-01):
- Fixed: Plus Jakarta Sans is applied at runtime for Vietnamese (`html lang="vi"`).
- Fixed: Clients supports add, search, edit, add contact, notes, and meaningful tab content using browser-local storage.
- Fixed: Settings rows without implemented destinations are visibly disabled/marked “Coming soon” instead of looking clickable.
- Fixed: AI send/voice actions are disabled and explicitly labeled as preview-only until a real AI service exists.
- Fresh real-browser audit on `http://localhost:3011`: 95 checks, 89 passed, 6 failed. Desktop/mobile top-level routes pass HTTP, Plus Jakarta Sans, `lang="vi"`, and horizontal-overflow checks.
- Fresh browser interaction checks pass for Calendar navigation/filter surfaces, Client search/add/edit/contact/notes, AI preview disabled state, and Settings unavailable-state labeling.
- Current 6 browser failures are all DB-dependent detail surfaces: Crew edit/upload, Equipment edit/upload, Project edit, Shoot edit. The pages render the database-unavailable state instead of their forms because the configured Supabase pooler is unreachable from this environment.
- Crew/equipment upload implementation remains present in source; upload/preview/remove cannot be re-exercised in the fresh runtime until the DB-backed detail pages can load.
- Remaining verification blocker: restore database connectivity, then re-run DB-backed create/edit persistence for Projects, Shoots, Crew, Equipment and live Google Calendar state.
- Product gap to keep visible: the Client → Projects tab currently reports the project count but is not backed by a dedicated client/project relationship model.

Fresh evidence:
- `qa-browser/audit.json` generated 2026-10-01T07:56:23.966Z against port 3011.
- `npm run typecheck` PASS.
- `npm test` PASS: 22 files, 137/137 tests.
- `npm run build` PASS; only existing `@next/next/no-img-element` warnings on the media preview/detail images.

Exit gate:
- Re-run desktop and mobile browser sweep after database connectivity is restored.
- Verify every enabled control causes the expected state/navigation change and no enabled dead control remains.
- Verify crew/equipment upload + save + reload persistence against the real database.
- Verify project/shoot CRUD and Google Calendar connect/sync flows against real services.
- `npm run typecheck`, `npm test`, `npm run build`, and browser QA all pass with a fresh audit log.

## Leader rule

Do not create new micro-tasks for ordinary implementation details. Codex should send Gemini the whole current LIVE task, review the returned diff, request fixes in the same run when needed, and move immediately to the next LIVE task after QA passes.
