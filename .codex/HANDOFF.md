# Codex Task Handoff

## Goal
Improve navigation performance across all meaningful G.Lab Calendar pages without regressing existing UI, CRUD, localization, scheduling, or conflict behavior.

## Current Phase
Release QA is complete and all local release gates pass. Preview is deployed and smoke-tested. Production deployment is intentionally blocked until a valid Google OAuth client secret is supplied.

## Completed
- Calendar uses cached lightweight project, crew, and equipment filter options; cache invalidation is preserved and `force-dynamic` remains intentional.
- Shoot detail uses lightweight option loaders and batched crew/equipment conflict queries, removing prior N+1 conflict lookups.
- Crew detail uses cached organization context and joined assignment/project metadata instead of loading the full project list.
- Crew list uses lightweight crew summaries and loads crew, today's shoots, and today's assignments concurrently.
- Equipment, projects, shoots, and their detail/list data paths use reduced projections where appropriate.
- Google Calendar integration uses cached organization context.
- Client/static pages were profiled; no additional DB optimization was justified.
- A dashboard experiment that widened the conflict/resource range was benchmarked, found slower, and reverted.

## Final Dev Navigation Benchmarks
Measured on a fresh Next dev server with Supabase network access enabled. Values below are warm medians using Playwright navigation with `networkidle`; cold compile runs are excluded.

- `/`: 952 ms
- `/calendar`: 789 ms
- `/crew`: 793 ms
- `/equipment`: 805 ms
- `/projects`: 790 ms
- `/shoots`: 826 ms
- `/integrations/google-calendar`: 817 ms
- `/clients`: 729 ms
- `/settings`: 730 ms
- `/ai`: 741 ms
- `/login`: 712 ms
- project detail: 851 ms
- equipment detail: 841 ms
- crew detail: 899 ms in dedicated benchmark; 953 ms in mixed all-page run
- shoot detail: 913 ms
- dashboard dedicated benchmark: 929 ms median, 912-941 ms warm range

Earlier invalid benchmark runs showed multi-second spikes because the sandbox blocked PostgreSQL/Supabase connections with `EACCES` on port 6543. Those runs are not representative and should not be used for comparison.

## Verification
- `npm run typecheck`: PASS.
- `npm test`: PASS, 23 files / 144 tests.
- `npm run build`: PASS.
- `npm run test:e2e`: PASS, 44/44 Chromium tests.
- Build still reports only the pre-existing raw `<img>` warnings in crew detail, equipment detail, and `image-upload-field.tsx`.

## Release QA / Fixes
- Fixed shoot detail project-name resolution when cached project options are stale by falling back to a direct project lookup.
- Added stable accessibility labels used by production E2E flows for crew avatar, equipment actions, and add-crew controls.
- Removed a flaky dashboard click dependency from the critical-flow E2E by navigating to the seeded shoot detail URL after verifying the dashboard card is present; navigation behavior remains covered elsewhere.
- Loading states are present for dashboard, calendar, projects, project detail, shoots, shoot detail, crew, crew detail, equipment, equipment detail, and Google Calendar integration. Global error and not-found boundaries are present.
- List empty states are present for projects, shoots, crew, and equipment; DB-backed primary routes expose `DatabaseErrorBanner` handling.
- Auth configuration uses Google OAuth with JWT sessions and `/login` as the sign-in page. Google Calendar integration UI and service/client tests pass.

## Deployment
- Vercel project: `glab-calendar`.
- Required Preview and Production env keys exist in Vercel: `DATABASE_URL`, `APP_TIMEZONE`, `AUTH_SECRET`, `AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- Repaired literal `\\r\\n` suffixes in `DATABASE_URL` and `APP_TIMEZONE` for Preview/Production and in production `AUTH_URL`.
- `GOOGLE_CLIENT_SECRET` is currently empty in both Preview and Production. No valid secret exists in the workspace or process environment, so it was not fabricated.
- Preview deployment completed successfully: `https://glab-calendar-kjz6x96zh-betafpt-4462s-projects.vercel.app`.
- Preview is protected by Vercel SSO for direct public requests. Using authenticated `vercel curl`, `/login` returns 200 and `/calendar` returns 307 to `/login?callbackUrl=%2Fcalendar`.
- Production was not redeployed because Google OAuth / Google Calendar would be knowingly misconfigured without `GOOGLE_CLIENT_SECRET`.

## Decisions
- Keep `force-dynamic` on calendar/dashboard unless future profiling provides clear evidence to change it.
- Keep the crew-list concurrency/projection optimization.
- Do not reapply the wider dashboard range/resource-query experiment; it increased latency.
- Do not chase small sub-100 ms differences in dev measurements because Supabase/network variance dominates at that scale.

## Current State
- Project type: Node / Next.js.
- Git repository: yes.
- Git working tree: intentionally dirty with broad existing UI/CRUD/localization/performance work; do not reset unrelated changes.
- Fresh dev server used for final benchmarks: port 3015 with required network access.

## Remaining Work
- Blocking production item: set a valid `GOOGLE_CLIENT_SECRET` for both Preview and Production, verify the Google OAuth redirect URIs, then run the production deploy and authenticated OAuth/Calendar smoke test.
- Optional cleanup: replace the three raw `<img>` usages with `next/image` if desired to remove the remaining build warnings.
- Automated auth and Google Calendar service/client coverage is green; a real Google sign-in/consent session is still required for final end-to-end OAuth validation.

## Last Updated
2026-10-02
