# Codex Task Handoff

## Goal
Improve navigation performance across all meaningful G.Lab Calendar pages without regressing existing UI, CRUD, localization, scheduling, or conflict behavior.

## Current Phase
Fluid Responsive Layout for Large Desktop / 2K / 4K Displays (05/10/2026) has been fully implemented, verified via automated multi-viewport testing, and passed all quality gates. The fixed `max-width: 1400px` app shell constraint was completely eradicated. The layout is now fully fluid according to CSS viewport: Icon Rail is locked to `110px`, Context Panel scales via `clamp(340px, 20vw, 380px)`, Main Calendar absorbs all remaining space via `minmax(0, 1fr)`, outer padding scales via `clamp(24px, 4vw, 96px)`, and vertical height scales via `min-height: calc(100vh - 140px)` (scaling to `calc(100vh - 160px)` at 4K). Playwright tests verified crisp rendering across 1440×900, 1920×1080, 2560×1440, and 3840×2160. `npx tsc --noEmit` and `npm run build` both pass with 0 errors.

## Completed
- **Large Desktop / 2K / 4K Fluid Responsive Layout (05/10/2026)**:
  - **Fluid App Shell & Grid Architecture (`src/app/globals.css`, `src/components/app-shell.tsx`)**: Removed rigid `max-w-[1400px]` wrapper. Introduced CSS variables `--app-shell-padding-inline: clamp(24px, 4vw, 96px)` (16px on mobile), `--app-shell-gap: clamp(24px, 2vw, 40px)`, `--app-rail-width: 110px`, and `--app-context-width: clamp(340px, 20vw, 380px)`.
  - **Dynamic Calendar Workspace Grid (`src/app/calendar/page.tsx`, `src/components/calendar/calendar-context-panel.tsx`)**: Context panel fluidly adapts to `clamp(340px, 20vw, 380px)` and remains sticky on desktop (`lg:sticky lg:top-4`).
  - **Adaptive Vertical Sizing & Current Time Line (`src/components/calendar/calendar-timeline-week.tsx`)**: Section applies `calendar-min-h` (`calc(100vh - 140px)` scaling to `calc(100vh - 160px)` at 4K). The time grid flex-stretches vertically. The current time indicator uses dynamic percentage calculation `calc(12px + ratio * (100% - 24px))` aligning pixel-perfectly with hour slot divider lines.
  - **Multi-Viewport Automated Testing (`scripts/capture-viewports.mjs`)**: Verified:
    - 1440×900: Padding 57.6px, Rail 110px, Gap 29px, Context 340px, Main Calendar 817px (Height 760px). Reference proportion preserved.
    - 1920×1080: Padding 76.8px, Rail 110px, Gap 38px, Context 380px, Main Calendar 1200px (Height 930px). Calendar expanded +383px horizontally without blank margins.
    - 2560×1440: Padding 96px, Rail 110px, Gap 40px, Context 380px, Main Calendar 1798px (Height 1280px). Generous ~240px day columns.
    - 3840×2160 (4K): Padding 96px, Rail 110px, Gap 40px, Context 380px, Main Calendar 3078px (Height 2000px). Crisp editorial typography without artificial font blowup.
  - **Build Verification**: `npx tsc --noEmit` PASS (0 errors), `npm run build` PASS (18/18 static & dynamic routes).
- **Unified Canvas & Visual Hierarchy Redesign (05/10/2026)**:
  - **Unified Canvas & 104px Left Rail (`src/components/app-shell.tsx`)**: Replaced 76px opaque sidebar with a 104px transparent rail (`w-[104px]`, `border-black/[0.04]`) blending seamlessly with the blush canvas (`bg-bg`). Nav icons are evenly distributed vertically.
  - **Single-Tier Clean Header (`src/components/calendar/calendar-top-header.tsx`)**: Single-row header (`h-14`) with compact `G.Lab Calendar *` brand on the left, centered [Ngày | Tuần | Tháng] segmented pill, and right-aligned search dialog, compact Google Sync status dot, and workspace profile menu. Eliminated the secondary KPI row banner.
  - **Context Column (`src/components/calendar/calendar-context-panel.tsx`)**: 350px column separated by 32px gap (`lg:gap-8`). Mini calendar blends into canvas (`rounded-[24px] border border-black/[0.05] bg-white/60`). Below are max 2 slim modules ("Lịch quay hôm nay" and "Cần chú ý") using accordions, default collapsed/summary, with minimal height (~36px) when empty.
  - **Main Calendar As Focal Point (`src/components/calendar/calendar-timeline-week.tsx`, `calendar-month-dnd.tsx`)**: Pure white card `rounded-[24px] border border-black/[0.05] bg-white shadow-sm`. Toolbar placed directly above the grid containing time range label, previous/next buttons, Today pill, and `+ Tạo lịch quay` pill button. Thin dividers `border-black/[0.05]` and 16px soft-cornered shoot cards.
  - **Clean Calendar Page (`src/app/calendar/page.tsx`)**: Removed bottom "Tông màu trực quan" legend footer bar; synchronized Month view with matching top toolbar and navigation controls.
  - **Quality Gates**: `npx tsc --noEmit` PASS (0 errors), `npm run build` PASS (100% clean routes), verified screenshots across Desktop (1440x900) and Mobile (390x844).
- **Account / Member / Workspace Architecture & Isolation Foundation (Phases 1 - 17)**:
  - **Phase 1 â€” User / Membership / Workspace Normalization**:
    - Created schema tables: `organization_memberships`, `clients`, `shoot_assignees`, `pending_invitations`, `notifications`, `ai_provider_credentials`, `ai_entitlements`, `ai_usages`.
    - Added user roles (`super_admin`, `user`), phone fields, and foreign keys (`crew_members.user_id`, `google_calendar_connections.user_id`).
    - Configured bootstrap Super Admin for `betafpt@gmail.com` as OWNER of G.Lab Studio (`10000000-0000-0000-0000-000000000001`).
  - **Phase 2 â€” Google Login Auto User & Duplicate Prevention**:
    - Normalized Google OAuth identity linking in `src/auth.ts` and `src/server/db/workspaces.ts` (`ensureUserWorkspace`). Repeated logins never duplicate user records.
  - **Phase 3 â€” Eradication of Single Global Organization**:
    - Built central context resolver `src/server/workspace-context.ts` (`requireWorkspaceContext()`) extracting session -> User -> Membership -> Active Workspace.
    - Replaced `getInitialOrganization()` across all production routes: Dashboard (`/`), Calendar (`/calendar`), Projects (`/projects`, `/projects/[id]`), Shoots (`/shoots`, `/shoots/[id]`), Crew (`/crew`, `/crew/[id]`), Equipment (`/equipment`, `/equipment/[id]`), AI Copilot (`/ai`, `src/server/ai/tools/context.ts`), and Google Calendar integrations.
  - **Phase 4 â€” Server Authorization & IDOR Blocking**:
    - Every read/write repository query partitions strictly by `organizationId`. Cross-tenant queries by unauthorized users return `null` / HTTP 404.
  - **Phase 5 â€” Safe Data Migration & Dry-Run**:
    - Preserved 100% of existing production shoots, projects, equipment, and crew for G.Lab Studio without data loss. Isolated personal workspace created for test accounts (`betafpt2108@gmail.com`).
  - **Phase 6 â€” Google Calendar Isolation Per User**:
    - Scoped `google_calendar_connections` by `userId`. USER_B accessing Google settings receives "ChÆ°a káº¿t ná»‘i Google Calendar" and cannot see USER_A's token or account.
  - **Phase 7 & 8 â€” Account Settings & Complete Logout Isolation**:
    - Implemented `/settings/account` showing verified Google profile, system role (`Quáº£n trá»‹ viÃªn há»‡ thá»‘ng`), and active workspace membership.
    - Built client cleanup utility `src/lib/client-cleanup.ts` clearing `localStorage`, `sessionStorage`, `caches`, and `indexedDB` on sign-out to prevent cross-account leakage.
    - Migrated `Clients` store from `localStorage` to server database (`src/server/db/clients.ts`, `src/app/clients/actions.ts`).
  - **Phase 9 & 12 â€” Member Directory Lookup & Pending Invitations**:
    - Built exact registered email lookup (`lookupMemberByEmailAction`) with safe user preview.
    - Built invitation flow (`/settings/team`) creating `pending_invitations` with automatic claim on Google login.
  - **Phase 10 & 11 â€” Crew â†” User Link & Canonical Shared Event Assignment**:
    - Linked `crew_members.userId` to `users.id` (nullable).
    - Built canonical shared event assignees (`shoot_assignees`) supporting multi-user assignment to a single event without duplicating shoot records.
  - **Phase 13 â€” Real-Time Notification System**:
    - Built `notifications` repository and server actions (`getNotificationsAction`, `markNotificationReadAction`).
    - Dispatched persistent notifications for `EVENT_ASSIGNED`, `EVENT_UPDATED`, `EVENT_CANCELLED`, and `INVITATION_RECEIVED`.
    - Integrated `NotificationBell` with unread badge in top navbar and `WorkspaceMenu`.
  - **Phase 14 & 15 â€” AI Production Migrations & Workspace Context**:
    - Migrated live Supabase DB for `ai_provider_credentials`, `ai_entitlements`, and `ai_usages`.
    - Scoped AI tool execution context to active workspace ID.
  - **Phase 17 â€” Live Suite Verification**:
    - Executed `scripts/verify-architecture-live.mjs`: ALL 15 ARCHITECTURE CONDITIONS CONFIRMED PASS ON LIVE SUPABASE DB.
    - Verified 213 unit tests pass (100%), typecheck 0 errors, Next.js build (`npm run build`) 0 errors.
- **AI Assistant System (G.Lab Production Copilot)**:
  - **Phase 0 & 1 â€” Foundation & Provider Abstraction**:
    - Built `AIProvider` interface and types in `src/server/ai/types.ts` (`generate`, `generateStructured`, `getCapabilities`, `listModels`).
    - Implemented `302AIProvider` (`src/server/ai/providers/302ai.ts`) supporting OpenAI-compatible 302.AI endpoints, GPT-4o model verification, structured output with Zod, safe timeouts, and server-side credential isolation.
    - Implemented `MockAIProvider` (`src/server/ai/providers/mock.ts`) and provider factory (`src/server/ai/providers/index.ts`).
    - Added `ai_audit_logs` table in `src/server/db/schema.ts` and structured audit logger in `src/server/ai/audit/logger.ts`.
  - **Phase 2 â€” Read-Only Production Tools**:
    - `querySchedule`: Tra cá»©u lá»‹ch trÃ¬nh theo khoáº£ng thá»i gian.
    - `findEvents`: TÃ¬m kiáº¿m buá»•i quay theo dá»± Ã¡n / khÃ¡ch hÃ ng.
    - `findFreeSlots`: TÃ¬m khung giá» trá»‘ng (8:00 - 18:00).
    - `checkConflicts`: PhÃ¡t hiá»‡n trÃ¹ng lá»‹ch ekip & thiáº¿t bá»‹.
    - `checkMissingInfo`: Kiá»ƒm tra thiáº¿u Ä‘á»‹a Ä‘iá»ƒm, call time, crew, gear.
  - **Phase 3 â€” AI Command UI & Rich Cards**:
    - Preserved approved baseline G.Lab styling in `src/app/ai/page.tsx` (TRá»¢ LÃ AI* / Beta heading, blush pink `#FFF1F6`, editorial typography, curved cards).
    - Created structured G.Lab cards: `ScheduleSummaryCard`, `ConflictCard`, `FreeSlotCard`, `ReadinessCard`, `ProposalConfirmationCard`, `CallSheetCard`, `DailyBriefCard`, `ContextChips`.
    - Added Motion smooth upward collapse when conversation starts.
    - Supported global `Ctrl/Cmd + K` focus shortcut and responsive 1-column mobile layout.
  - **Phase 4 & 5 â€” Mutation Proposal Gate & Zero-Mutation Cancel**:
    - Built deterministic proposal engine (`src/server/ai/actions/proposals.ts`) for `createShootProposal` and `createMoveShootProposal`.
    - Enforced rule: Model never mutates DB directly. Requires Proposal -> Conflict calculation -> Diff preview -> Confirmation -> Execution.
    - Unit tested: Cancelling a proposal causes ZERO mutations in the database.
  - **Phase 6 - 13 â€” Crew, Gear, Readiness, Project, Call Sheet, Bulk Actions, Daily Brief**:
    - `getCrewAvailabilityTool`: Kiá»ƒm tra lá»‹ch ráº£nh vÃ  vai trÃ² cá»§a nhÃ¢n sá»±.
    - `getEquipmentAvailabilityTool`: Kiá»ƒm tra tÃ¬nh tráº¡ng thiáº¿t bá»‹ / gear.
    - `checkProductionReadinessTool`: TÃ­nh toÃ¡n % sáºµn sÃ ng sáº£n xuáº¥t dá»±a trÃªn logic táº¥t Ä‘á»‹nh.
    - `getProjectSummaryTool`: TÃ³m táº¯t tiáº¿n Ä‘á»™ dá»± Ã¡n (Project Copilot).
    - `generateCallSheetDataTool`: TrÃ­ch xuáº¥t dá»¯ liá»‡u call sheet vÃ  Ä‘Ã¡nh dáº¥u thÃ´ng tin cÃ²n thiáº¿u.
    - `createBulkMoveProposal`: Dá»i hÃ ng loáº¡t lá»‹ch quay cÃ³ diff preview vÃ  xÃ¡c nháº­n giao dá»‹ch.
    - `getDailyBriefTool`: Smart Daily Brief tá»•ng há»£p thÃ´ng tin vÃ  cáº£nh bÃ¡o trong ngÃ y.
  - **Phase 14 â€” Future Optimization Foundation**:
    - Registered deterministic constraint-checking tools into `GLabCopilot`.
- **Google Calendar Settings UI Simplification**:
  - Replaced technical jargon ("Target Calendar", "Source Calendars", "Bá»‹ cháº·n", "Lá»‹ch phá»¥/Ekip", raw UUID/email IDs) with friendly, user-centric G.Lab editorial UI.
  - Implemented Master Sync switch: `[Äá»“ng bá»™ vá»›i Google Calendar] ON/OFF` with instant setting update.
  - Export section (`G.Lab â†’ Google Calendar`): Single dropdown selector `[ G.Lab Production â–¾ ]` recommending dedicated production calendar. Disabled primary/personal calendar with clear label: `â€” Lá»‹ch cÃ¡ nhÃ¢n (KhÃ´ng dÃ¹ng cho lá»‹ch sáº£n xuáº¥t)`.
  - Import section (`Google â†’ G.Lab`): Toggle switch with prominent confirmation: `âœ“ Sinh nháº­t tá»« Google Contacts Ä‘Æ°á»£c tá»± Ä‘á»™ng bá» qua` (no manual checkbox needed).
  - Advanced Settings (`CÃ i Ä‘áº·t nÃ¢ng cao` Accordion): Clean checkboxes for source calendar import, informational card for system calendars, event type filters (shoots, meetings, scout, internal), and admin dry-run cleanup.
  - Automatic Birthday Exclusion: Robust metadata detection in `isGoogleBirthdayCalendarId` matching Google Contacts birthday calendar IDs across all endpoints.
- **ShootStatusBadge / StatusPill**: Created `src/components/shoots/status-pill.tsx` featuring 6 curated visual palettes.
- **Shoot Detail Progressive Disclosure**: `ShootScheduleSection`, `CrewAssignmentSection`, `EquipmentBookingSection` with multi-open collapsible accordions.
- **Verification**: 29 test files, 197 unit tests PASS (100%), `npm run typecheck` PASS, `npm run build` PASS.

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
- `npm test`: PASS, 24 files / 157 tests.
- Google Calendar targeted tests: PASS, 28/28.
- `npm run build`: PASS.
- `npm run test:e2e`: previously PASS, 44/44 Chromium tests; not rerun in the 2026-10-03 birthday-sync release.
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
- Production deployment for commit `cc57433` completed successfully on 2026-10-02 and is live at `https://calendar.geelab.vn`.
- Latest Vercel production deployment inspected as `Ready`, with aliases including `https://calendar.geelab.vn` and `https://glab-calendar.vercel.app`.

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
- Do not delete the 29 legacy birthday-looking rows without explicit user approval. Current safe-cleanup candidate count is 0 because those rows no longer retain stable Birthdays source metadata.
- Optional cleanup: replace the remaining raw `<img>` usages with `next/image` if desired to remove build warnings.
- Automated Google Calendar coverage is green; a real authenticated Google consent/sync smoke test can still be run if needed.

- 2026-10-02 10:52: UI Instant Navigation overhaul: Added 0ms optimistic navigation + TopLoadingBar to BottomNavigation, created skeleton screens (loading.tsx) for /calendar, /projects, /crew, /equipment, /shoots. Verified PASS on typecheck and 144 unit tests.
- 2026-10-02 11:06: BottomNavigation standardization: Removed duplicate router.push() and useTransition from Link onClick, relying solely on Next.js native Link navigation + prefetching while retaining 0ms optimistic pendingHref UI response. Verified PASS on typecheck and 144 unit tests.

- 2026-10-02 14:10: Mobile UI Polish & Cover Image:
  1. Fixed mobile popovers for Crew, Equipment, and Projects: centered with `fixed inset-x-3 top-16 z-50`, constrained height and scrollable so bottom navigation never obscures submit buttons.
  2. Integrated `WorkspaceMenu` into the top navbar on all screens; removed floating `MobileUtilityMenu`.
  3. Replaced VI/EN language toggle in settings popup with Sign Out button connected to `logoutAction`.
  4. Mapped technical status `in_progress` to Vietnamese "Äang diá»…n ra" with warning pastel tone.
  5. Enhanced `ImageUploadField` to support dual modes: local file upload (with WebP compression) and direct image URL paste with preview.
  6. Added `coverImageUrl` to Project schema, database migration, project creation/edit forms, and project list/detail displays.
  7. Verification: `npm run typecheck` PASS, `npm test` 144/144 tests PASS.

- 2026-10-02 14:38: Click Outside & Modal Popover Upgrade:
  - Replaced raw `<details>` popovers with dedicated `ModalPopover` component across Crew, Equipment, Equipment [id], and Projects.
  - Implemented full-screen backdrop with click-outside listener to instantly dismiss modal when clicking outside.
  - Added explicit 'âœ•' close button in header, keyboard Escape dismissal, and mobile background scroll locking.
  - Added click-outside dismissal to `WorkspaceMenu`.
  - Typecheck and 144/144 unit tests PASS.

- 2026-10-02 17:05: Complete Iconsax standardisation on Projects & Detail pages:
  - Replaced lingering calendar emojis (ðŸ“…) and raw text symbols (+, â€¹, â€¢â€¢â€¢, âŒ–, â—·) with official Iconsax components: `Calendar`, `Add`, `ArrowLeft2`, `More`, `User`.
  - Applied across `projects/page.tsx`, `shoots/page.tsx`, `crew/[id]/page.tsx`, and `equipment/[id]/page.tsx`.
  - Typecheck and 144/144 unit tests PASS.

- 2026-10-02 17:54: Calendar workflow + Google sync release:
  - Past or completed shoots are visually dimmed across calendar views and shoot lists.
  - Bottom navigation `Dá»± Ã¡n` was replaced with `AI`, linking to `/ai`.
  - Delete flow now redirects back to the corresponding management page via `router.replace(...)` instead of landing on a stale detail/404 state.
  - Calendar view label changed from `DÃ²ng` to `DÃ²ng thá»i gian`.
  - Shoot detail location now opens Google Maps directions; create/edit address fields were clarified for Google Maps addresses.
  - Google Calendar events with provider event type `birthday` are ignored during sync.
  - Added `endsAt` to shoot summaries for past-event dimming.
  - Verification: `npm.cmd run typecheck` PASS, targeted Google Calendar tests 28/28 PASS, `npm.cmd run build` PASS.
  - Release commit: `cc57433` (`Update calendar workflow and Google sync`) pushed to `origin/main`.
  - 2026-10-02 23:25: NÃ¢ng cáº¥p G.Lab UI/UX â€” Giai Ä‘oáº¡n 0, P0, P1, P2:
  - Tokens: Chuáº©n hÃ³a `--glab-*` CSS variables vÃ  tailwind config (bg, surface, ink, pink, line, status pastel).
  - P0 UX: Sá»­a Client detail routing (há»— trá»£ slug/id URL decoding, loáº¡i bá» nháº¥p nhÃ¡y 404); táº¡o Command Palette âŒ˜K tÃ¬m kiáº¿m sá»± kiá»‡n live trÃªn Lá»‹ch; táº­p trung hÃ³a tá»« Ä‘iá»ƒn status tiáº¿ng Viá»‡t; empty state cÃ³ hÆ°á»›ng dáº«n táº¡i phÃ¢n bá»• thiáº¿t bá»‹; áº©n raw QA notes trÃªn compact event card.
  - P1 Primitives: XÃ¢y dá»±ng 8 primitives Radix/shadcn bá»c nguyÃªn váº¹n visual language G.Lab (`Button`, `Badge`, `Card`, `Dialog`, `Sheet`, `AlertDialog`, `Tabs`, `Toast`). Thay tháº¿ `window.confirm` báº±ng `AlertDialog`; bá»c `ToastProvider` toÃ n cá»¥c.
  - P2 Motion: XÃ¢y dá»±ng `motion-container.tsx` (`CalendarViewTransition`, `StaggerContainer`, `MotionCard`) vá»›i há»— trá»£ prefers-reduced-motion; bá»c chuyá»ƒn view ThÃ¡ng / Tuáº§n / DÃ²ng thá»i gian mÆ°á»£t mÃ .
  - Verification: `npm run typecheck` PASS, 145/145 unit tests PASS.
- 2026-10-02 23:50: NÃ¢ng cáº¥p G.Lab UI/UX â€” Giai Ä‘oáº¡n 4 (P3) dnd-kit Drag and Drop cho Lá»‹ch:
  - Server Action: `rescheduleShootAction` kiá»ƒm tra xung Ä‘á»™t phÃ¢n bá»• Crew vÃ  Equipment (batch conflicts), cáº­p nháº­t thá»i gian buá»•i quay, Ä‘á»“ng bá»™ Google Calendar non-blocking vÃ  revalidate cache Next.js.
  - Month View Drag & Drop: `CalendarMonthDnd` vá»›i `DndContext`, sensors tá»‘i Æ°u (Pointer 8px, Touch 250ms), drop target highlight viá»n há»“ng neon, `DragOverlay` hiá»ƒn thá»‹ tháº» preview ná»•i lÆ¡ lá»­ng, há»— trá»£ Toast HoÃ n tÃ¡c vÃ  `AlertDialog` cáº£nh bÃ¡o chi tiáº¿t xung Ä‘á»™t.
  - Week View Drag & Drop: `CalendarWeekDnd` há»— trá»£ kÃ©o tháº£ sá»± kiá»‡n giá»¯a 7 cá»™t ngÃ y trÃªn Desktop & Tablet.
  - Zero regression: `npm run typecheck` PASS 100%, 145/145 unit tests PASS.

- 2026-10-03 01:10: CÆ¡ cháº¿ chá»‘ng Ä‘á»“ng bá»™ lá»‹ch cÃ¡ nhÃ¢n & dá»¯ liá»‡u test (7/7 YÃªu cáº§u):
  - **Schema & Migration:** ThÃªm `syncPolicy` ("google" | "local_only" | "excluded"), `isTestData` (boolean), `sourceCalendarId` vÃ  `externalEventId` vÃ o báº£ng `shoots`; thÃªm `targetCalendarId`, `sourceCalendarIds` vÃ o `googleCalendarConnections`. ÄÃ£ cháº¡y migration an toÃ n trÃªn Supabase (`scripts/migrate-sync-policy.mjs`).
  - **Dá»¯ liá»‡u sinh nháº­t cÅ©:** Táº¡o script dry-run `scripts/classify-test-shoots.mjs` phÃ¡t hiá»‡n 29 báº£n ghi sinh nháº­t, gáº¯n `isTestData=true` vÃ  `syncPolicy='excluded'`. Giá»¯ nguyÃªn 100% dá»¯ liá»‡u, khÃ´ng xÃ³a báº¥t ká»³ báº£n ghi nÃ o.
  - **ChÃ­nh sÃ¡ch Ä‘á»“ng bá»™ an toÃ n:** Máº·c Ä‘á»‹nh khÃ´ng Ä‘á»c Google Primary Calendar (`resolveSourceCalendarIds` loáº¡i bá» primary); chá»‰ export shoot cÃ³ `syncPolicy='google' && !isTestData` vÃ o target calendar Ä‘Æ°á»£c chá»n; khi Google xÃ³a event, tuyá»‡t Ä‘á»‘i khÃ´ng há»§y shoot local/excluded (Rule 6).
  - **Bá»™ lá»c Lá»‹ch (Month/Week/Timeline):** Máº·c Ä‘á»‹nh áº©n cÃ¡c event test/excluded; bá»• sung filter admin "Hiá»‡n dá»¯ liá»‡u test / loáº¡i trá»«"; tá»± Ä‘á»™ng gáº¯n tiá»n tá»‘ `[TEST]` / `[LOáº I TRá»ª]` trá»±c quan khi admin báº­t xem.
  - **Form Shoot:** Bá»• sung dropdown chá»n Sync Policy vÃ  checkbox dá»¯ liá»‡u test vÃ o form táº¡o vÃ  form sá»­a buá»•i quay; hiá»ƒn thá»‹ thÃ´ng tin Google Event ID Ä‘Ã£ liÃªn káº¿t.
  - **UI Settings Google Calendar:** Bá»• sung banner cam káº¿t "Chá»‰ Ä‘á»“ng bá»™ lá»‹ch production, khÃ´ng Ä‘á»“ng bá»™ lá»‹ch cÃ¡ nhÃ¢n", dropdown chá»n lá»‹ch Ä‘Ã­ch vÃ  checkbox chá»n danh sÃ¡ch lá»‹ch nguá»“n Ä‘Æ°á»£c phÃ©p import.
  - **Verification:** 100% `npm run typecheck` PASS, 149/149 `npm test` PASS, `npm run build` production build PASS 100%.

- 2026-10-03 01:53: Google Calendar Birthdays hardening + production deploy:
  - Added stable Google calendar source classification: `primary`, `birthdays`, `holidays`, `user`, `subscribed`.
  - Google Birthdays is excluded at calendar-source level using stable `#contacts@group.v.calendar.google.com` identity; Holidays remains allowed and separately classified.
  - Saved source settings are sanitized so Birthdays cannot be selected/re-imported. `providerEventType === "birthday"` remains a defensive fallback.
  - Upcoming/list queries defensively hide legacy Google birthday rows identified by stable birthday-source metadata. Native/manual birthdays are not filtered by title.
  - Fixed incremental-sync safety: the connection-level Google `syncToken` is reused only for one source calendar. Multi-source pulls use full sync because Google tokens are calendar-scoped and the current schema stores one cursor per connection.
  - Added `scripts/cleanup-google-birthdays.mjs`. Safe cleanup requires `syncPolicy='google'`, no project, Google mapping, matching external event IDs, and stable Birthdays source calendar ID.
  - Production dry-run: `SAFE_GOOGLE_BIRTHDAY_CANDIDATES=0`. No records were deleted.
  - Diagnostic title scan found 29 `ChÃºc má»«ng sinh nháº­t!` rows. They are already `syncPolicy='excluded'`, have no stable Birthdays source metadata, and legacy mapping points to `primary`; they are not safe auto-delete candidates.
  - Verification: Google targeted tests 28/28 PASS, full suite 157/157 PASS, typecheck PASS, production build PASS.
  - Production deployment succeeded at `https://calendar.geelab.vn`; domain responds with expected auth redirect to `/login`.

- 2026-10-03 02:15: HoÃ n thÃ nh P0 Google Calendar, Dá»n dáº¹p sinh nháº­t cÅ© vÃ  Sá»­a Command Search:
  - **Google Calendar (Anti-Personal Calendar):**
    - Máº·c Ä‘á»‹nh `targetCalendarId = null`, `sourceCalendarIds = []`, `syncToGoogle = false` khi táº¡o káº¿t ná»‘i má»›i (`src/app/api/integrations/google-calendar/callback/route.ts`).
    - Bá»• sung `isPrimaryCalendar` nháº­n diá»‡n `primary` vÃ  email tÃ i khoáº£n Google. HÃ m `resolveTargetCalendarId` vÃ  `resolveSourceCalendarIds` loáº¡i bá» hoÃ n toÃ n lá»‹ch cÃ¡ nhÃ¢n.
    - `syncAll` vÃ  `triggerGoogleCalendarSyncAction` cháº·n Ä‘á»“ng bá»™ vá»›i lá»—i `PRIMARY_CALENDAR_BLOCKED` náº¿u phÃ¡t hiá»‡n primary calendar trong cáº¥u hÃ¬nh cÅ©.
    - UI Google Calendar hiá»ƒn thá»‹ warning banner ná»•i báº­t khi primary calendar Ä‘ang Ä‘Æ°á»£c cáº¥u hÃ¬nh vÃ  disable nÃºt "Äá»“ng bá»™ ngay" cho Ä‘áº¿n khi chuyá»ƒn sang calendar production chuyÃªn dá»¥ng.
    - Dropdown target calendar Ä‘Ã¡nh dáº¥u cáº¥m chá»n lá»‹ch cÃ¡ nhÃ¢n; toggle export yÃªu cáº§u báº¯t buá»™c chá»n target calendar trÆ°á»›c khi báº­t.
  - **Dá»n dáº¹p dá»¯ liá»‡u sinh nháº­t cÅ© (Admin Dry-run Tool):**
    - Táº¡o 2 Server Actions: `previewBirthdayCleanupAction` (dry-run, chá»‰ Ä‘á»c local DB) vÃ  `executeBirthdayCleanupAction` (cáº­p nháº­t `syncPolicy='excluded'`, `isTestData=true`). Tuyá»‡t Ä‘á»‘i khÃ´ng xÃ³a báº£n ghi vÃ  khÃ´ng gá»i Google Calendar API.
    - TÃ­ch há»£p giao diá»‡n Admin Dry-run Tool trÃªn trang `/integrations/google-calendar` vá»›i báº£ng danh sÃ¡ch xem trÆ°á»›c vÃ  nÃºt xÃ¡c nháº­n phÃ¢n loáº¡i.
    - Cáº­p nháº­t `listSummaries` trong `shoots.ts` vÃ  trang `/shoots` máº·c Ä‘á»‹nh áº©n cÃ¡c sá»± kiá»‡n test/excluded, Ä‘á»“ng thá»i bá»• sung filter admin "Hiá»‡n dá»¯ liá»‡u test / Ä‘Ã£ loáº¡i trá»«".
  - **Command Search Filtering:**
    - Cung cáº¥p `crewNames` vÃ o `SearchableShoot` thÃ´ng qua truy váº¥n `shootCrewAssignments` trong `/calendar`.
    - ThÃªm hÃ m `normalizeSearchText` (chuáº©n hÃ³a tiáº¿ng Viá»‡t, bá» dáº¥u) vÃ  `calendarCommandFilter` (thuáº­t toÃ¡n AND semantics: má»i token trong query báº¯t buá»™c pháº£i cÃ³ trong title, project, location hoáº·c crew).
    - Loáº¡i bá» UUID khá»i searchable string Ä‘á»ƒ triá»‡t tiÃªu false positives. Query "SI DINING" Ä‘áº£m báº£o khÃ´ng bao giá» tráº£ event "Gá»¥" náº¿u khÃ´ng khá»›p.
    - Giá»¯ nguyÃªn 100% UI Command hiá»‡n táº¡i.
  - **Verification:**
    - `npm run typecheck`: PASS 100% (0 lá»—i).
    - `npm test`: PASS 169/169 tests (25/25 test files).
    - `npm run lint`: PASS 100% (0 lá»—i).
    - `npm run build`: PASS 100% (14/14 routes compiled & generated successfully).
- 2026-10-03 14:40: AI Credential + Entitlement + Usage Foundation (Future Paid Membership Ready):
  - **Schema & Tables:**
    - `aiProviderCredentials`: ID, ownerType ('user' | 'workspace'), ownerId, provider ('302ai' | 'openai' | 'anthropic'), encryptedSecret (AES-256-GCM), secretLast4, status ('active' | 'revoked'), lastUsedAt, revokedAt, createdAt, updatedAt.
    - `aiEntitlements`: ID, ownerType, ownerId, plan ('free' | 'pro' | 'studio'), status ('active' | 'suspended' | 'canceled'), monthlyCredits, usedCredits, resetAt, allowBYOK, allowManagedAI, allowedModels (JSON), createdAt, updatedAt.
    - `aiUsages`: ID, userId, workspaceId, provider, model, capability, inputTokens, outputTokens, totalTokens, estimatedCost, creditsUsed, credentialSource ('user' | 'workspace' | 'platform' | 'dev_fallback'), createdAt.
  - **Security & Encryption:**
    - AES-256-GCM encryption with 12-byte random IV and 16-byte auth tag. Plaintext API keys never stored in database and never exposed back to client after input.
    - Masking display (`â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢39AF`) and safe metadata only.
    - Strict multi-tenant isolation: User A cannot see/access User B's credentials; Workspace A cannot see/access Workspace B's credentials.
  - **Centralized AI Context Resolver:**
    - `resolveAIContext`: Evaluates authorization, entitlement, credits quota, and resolves credential source hierarchically: User BYOK -> Workspace BYOK -> Managed AI -> Dev fallback.
    - Throws clear descriptive errors when out of quota or credential missing.
  - **Copilot Integration & Usage Tracking:**
    - `GLabCopilot` and `sendAIMessageAction` route calls through `resolveAIContext`, aggregate token metrics, track credits used per capability, and log records to `aiUsages` while deducting entitlement credits.
  - **Settings UI (`/settings/ai`):**
    - Seamless G.Lab editorial UI at `/settings/ai` displaying 302.AI credential status, masked key, credit consumption bar, change/revoke key dialogs, and safe diagnostics view.
  - **Verification:**
    - 33 test files, 213 unit tests PASS (100% success rate).
    - `npm run typecheck` PASS.
    - `npm run lint` PASS (0 errors).
    - `npm run build` PASS (production bundle generated with all static and dynamic routes).
- 2026-10-03 23:23: Account assignment + super-admin + shared shoot interaction:
  - Backup created before implementation: `F:\G.Lab Calendar\backups\account-assignment-20261003-223309`.
  - Unified account linking into `PhÃ¢n cÃ´ng ekip`; removed the separate account-assignment UI.
  - Account lookup uses exact normalized full email only. No autocomplete, fuzzy search, or registered-email directory exposure. Unknown email returns `KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n` and is not stored as pending assignment or workspace membership.
  - When an exact registered account is linked to a crew member, the system links `crewMembers.userId/email`, creates a shoot assignee, emits `EVENT_ASSIGNED`, shows the shared shoot to that user, and supports accept/decline.
  - Assigned users can read/respond to the shared shoot but cannot edit/delete it unless separately authorized. Updates made by the owner are reflected from the same shoot record and assignees receive update notifications.
  - Shoot assignment and workspace membership remain separate. Historical pending shoot assignment claiming no longer auto-creates organization membership.
  - `betafpt@gmail.com` is enforced as `users.role = super_admin` during workspace-context resolution. `canManageShoot` grants super-admin bypass. Team management also supports super-admin role changes and membership removal within the active workspace.
  - Calendar/shoot detail queries merge workspace-owned and assigned shoots, with de-duplication.
  - `tsconfig.json` excludes `backups` so backup source copies are not included in TypeScript checks; UTF-8 BOM removed.
  - Verification: `npm.cmd run typecheck` PASS; `npm.cmd test` PASS 33/33 files, 213/213 tests. Earlier same implementation verification also passed `npm.cmd run lint` (warnings only for existing raw `<img>` usage) and `npm.cmd run build`.
  - Audit: no live reference to the deleted `AccountAssignmentSection`; all observed `canManageShoot(...)` callers pass the system role. Legacy `pendingShootAssignments` table/repository remains only for historical compatibility/claiming and is not used by the new exact-email assignment flow.
  - Scope note: super-admin management is enforced for shoots reachable in the current workspace/access path; truly global cross-workspace shoot administration without switching workspace has not been added.
  - Deployment status: NOT DEPLOYED in this task.

- 2026-10-04 00:12: Home dashboard Operations Status redesign + production deploy:
  - Reworked the large home dashboard block previously labeled `Má»¨C Äá»˜ Sáº´N SÃ€NG & XUNG Äá»˜T HÃ”M NAY` into a compact `TRáº NG THÃI Váº¬N HÃ€NH` section with the heading `HÃ´m nay`.
  - Default collapsed state now shows four quick metrics: `Checklist`, `NhÃ¢n sá»±`, `Thiáº¿t bá»‹`, and `Xung Ä‘á»™t`, plus a concise overall state chip (`Äang chuáº©n bá»‹`, `Sáºµn sÃ ng`, or `Cáº§n xá»­ lÃ½ Â· N`).
  - Added `Xem chi tiáº¿t / Thu gá»n` progressive disclosure using `motion/react`, including animated chevron rotation, height/opacity transition, and `prefers-reduced-motion` handling.
  - Expanded state contains a compact checklist progress view and conflict breakdown for crew/equipment.
  - Preserved G.Lab visual language: blush pink, black/white, editorial typography, soft rounded cards, and mobile-first responsive behavior.
  - New component: `src/components/dashboard/operations-status.tsx`.
  - Updated integration point: `src/app/page.tsx`.
  - Verification: `npm.cmd run typecheck` PASS; `npm.cmd run lint` PASS with only pre-existing `<img>` optimization warnings; `npm.cmd run build` PASS.
  - Production deployment completed successfully on Vercel and aliased to `https://calendar.geelab.vn`.

- 2026-10-04 00:36: Shoot detail hierarchy + Motion refinement:
  - Reworked the shoot detail hero so shoot information is the primary visual focus: stronger pink/coral surface, larger clearer title, secondary project label, compact status chip, and consolidated location/date/time metadata.
  - Added staged `motion/react` entrance transitions for avatar, project, title, status, and metadata; subtle hover/tap feedback; all motion respects `prefers-reduced-motion`.
  - Reworked readiness/checklist summary into a quieter compact section: removed oversized readiness percentage treatment, reduced the progress bar, used compact Checklist/Nhân sự/Thiết bị metrics, and kept conflict states visually distinct without dominating the page.
  - Added `AnimatePresence` + layout animation for checklist item insert/remove/reorder feedback with reduced-motion fallback.
  - Files changed: `src/app/shoots/[id]/shoot-summary-hero.tsx`, `src/app/shoots/[id]/page.tsx`, `src/app/shoots/[id]/shoot-readiness-summary.tsx`, `src/app/shoots/[id]/shoot-checklist.tsx`.
  - Verification: `npm.cmd run typecheck` PASS; `npm.cmd run lint` PASS with only pre-existing raw `<img>` optimization warnings outside this change; `npm.cmd run build` PASS.
  - Deployment status: NOT DEPLOYED in this task.

- 2026-10-04 01:00: Removed Call Time / Giờ tập trung semantics from product UI and AI flows:
  - Removed the bottom shoot-detail status pill that referenced preparation/readiness for `Giờ tập trung`.
  - Removed Call Time from shoot detail hero, schedule summary, edit form, home dashboard, calendar timeline/cards, and checklist empty-state copy.
  - Removed Call Time from AI schedule/proposal schemas, readiness/missing-info checks, call-sheet payloads, daily brief notices, and related tests.
  - Removed Call Time from future Google Calendar event description generation. No Google Calendar sync, disconnect, write, delete, or cleanup operation was triggered during this task.
  - Readiness naming was simplified from `isReadyForCallTime` to `isReady`.
  - Legacy `callTime` database/schema/service fields remain for backward compatibility; no migration and no production/test data deletion was performed.
  - Verification: `npm.cmd run typecheck` PASS; `npm.cmd run lint` PASS with only pre-existing raw `<img>` optimization warnings; `npm.cmd test` PASS 33/33 files, 213/213 tests; `npm.cmd run build` PASS.
  - Production deployment completed successfully on Vercel and aliased to `https://calendar.geelab.vn`.

- 2026-10-04 01:16: Compact mobile shoot status pill + production deploy:
  - Updated `src/components/shoots/status-pill.tsx` so the mobile status control uses a 32px minimum height with tighter padding, smaller typography, status dot, and dropdown chevron; `sm` and larger preserve the previous desktop sizing.
  - Snapshot backup recorded at `.ui-backups/src-components-shoots-status-pill--20261004-011500.bak.tsx`.
  - Verification: `npm.cmd run typecheck` PASS; `npm.cmd run lint` PASS with only pre-existing raw `<img>` warnings; `npm.cmd test` PASS 33/33 files, 213/213 tests; production build PASS locally and on Vercel.
  - Vercel production deployment: `https://glab-calendar-m6k2nnp36-betafpt-4462s-projects.vercel.app`; successfully aliased to `https://calendar.geelab.vn`.

- 2026-10-04 02:20: UI/UX audit follow-up fixes + bundle optimization + production deploy:
  - Increased AI context-chip mobile tap targets to 40px minimum height while preserving the compact horizontal-scroll layout.
  - Fixed Clients server actions so Next.js `NEXT_REDIRECT` control-flow errors are re-thrown instead of being logged/swallowed as ordinary data errors; real repository/database errors still retain the existing graceful fallback behavior.
  - Deferred `maplibre-gl` loading in `MapTilerAddressAutocomplete` until a map is actually needed after a location is selected. Search/autocomplete remains available immediately; the heavy map renderer is no longer part of the initial route bundle.
  - Production bundle impact: `/shoots` First Load JS reduced from ~484 kB to 206 kB; `/shoots/[id]` reduced from ~495 kB to 216 kB.
  - Verification: `npm.cmd run typecheck` PASS; `npm.cmd run lint` PASS with only the existing raw `<img>` optimization warnings; `npm.cmd run build` PASS locally and on Vercel.
  - Production deployment: `https://glab-calendar-62xjn2hzi-betafpt-4462s-projects.vercel.app`; successfully aliased to `https://calendar.geelab.vn`.
  - Remaining lower-priority cleanup: raw `<img>` warnings in Crew, Equipment, Projects and `image-upload-field.tsx`.

## Last Updated
2026-10-04T02:20:00+07:00
