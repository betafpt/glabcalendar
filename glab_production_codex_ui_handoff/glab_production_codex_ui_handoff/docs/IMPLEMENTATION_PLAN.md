# UI Implementation Plan

## Phase 0 — Audit
- inspect repo
- identify routing/framework/state/data patterns
- identify current design system
- verify reference images can be opened by Codex

## Phase 1 — Foundations
- design tokens
- typography
- icon strategy
- AppScreen / safe area
- card / chip / button primitives
- bottom navigation
- motion utilities

Acceptance: isolated component gallery visually matches reference language.

## Phase 2 — Core scheduling shell
- Today
- Month Calendar
- Week Calendar
- EventCard
- timeline interactions

Acceptance: calendar views visually and behaviorally coherent.

## Phase 3 — Projects / shoots
- project list
- project detail
- shoot detail
- new shoot flow
- checklist

## Phase 4 — Resources
- crew list/detail
- gear library/detail
- booking and conflict visuals

## Phase 5 — CRM / utility
- clients / client detail
- login/onboarding
- settings
- Google Calendar integration
- AI assistant shell

### Google Calendar follow-up — automatic two-way sync

Current production state:
- Google OAuth is connected and manual two-way sync is working.
- G.Lab -> Google Calendar sync already runs automatically after shoot create/update.
- Google Calendar -> G.Lab still runs only when `syncAll()` is triggered, currently via "ĐỒNG BỘ NGAY".

Planned implementation:
1. Add Google Calendar `events.watch` push notification channel for the connected calendar.
2. Add a public webhook endpoint for Google Calendar change notifications.
3. Persist watch channel ID, resource ID, expiration, calendar ID, and renewal metadata.
4. On webhook notification, trigger incremental reconciliation using the stored `nextSyncToken` rather than treating the webhook payload as event data.
5. Renew expiring channels automatically and stop stale channels when reconnecting/disconnecting.
6. Keep existing idempotent event mapping, sync hashes, cancellation handling, and last-write-wins rules to avoid loops/duplicates.
7. Add a Vercel Cron fallback for periodic reconciliation and watch-channel renewal/recovery.
8. Production QA: verify create/edit/delete from both G.Lab and Google propagate automatically without pressing "ĐỒNG BỘ NGAY".

Acceptance:
- Changes made in G.Lab appear in Google Calendar automatically.
- Changes made in Google Calendar appear in G.Lab without a manual sync action.
- Duplicate notifications or repeated syncs do not create duplicate records.
- Missed webhook delivery is recovered by incremental sync / scheduled fallback.
- OAuth reconnect/disconnect leaves no orphaned active watch channel owned by the app.

## Phase 6 — Motion polish
- shared transitions
- drag scheduling
- progress animation
- state feedback
- reduced motion

## Phase 7 — Responsive web
- sidebar shell
- desktop calendar
- list/detail split views
- responsive token tuning

## Phase 8 — Visual QA
For each screen:
1. open reference image side-by-side
2. test target width
3. compare hierarchy, spacing, radius, color, text scale, imagery and density
4. fix drift
5. test interactions
6. capture screenshots for review
