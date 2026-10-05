# G.Lab Calendar — Android Native App Plan

> Status: Deferred until the next web UI/UX refinement pass is completed.
> Priority: Web UI first, Android implementation second.
> Goal: Build a true native Android app experience, not a WebView wrapper around the existing Next.js website.

## 1. Strategic direction

G.Lab Calendar will keep the existing Next.js web application and shared backend/database. The Android app will be built as a separate React Native client that uses the same authenticated backend services and production data.

The web app remains the active product while Android is being developed. Android work must not require rewriting the current backend or destabilizing Month / Week / Day, shoots, clients, crew, equipment, AI, or Google Calendar flows.

## 2. Work order

### Stage A — Finish the current web UI/UX pass first

Before starting Android implementation:

- Complete remaining web UI/UX refinements.
- Fix mobile web interaction and layout issues that are still unresolved.
- Stabilize the visual language and component behavior that Android should inherit conceptually.
- Confirm the final information architecture for Calendar, Shoot Detail, Create/Edit Shoot, Clients, Crew, Equipment, Settings, and AI.
- Avoid large Android-specific repository restructuring during this stage.

Android implementation starts only after the web UI direction is stable enough to act as the product reference.

### Stage B — Android native foundation

After the web UI pass is complete, create a new native mobile client alongside the current web application.

Initial target structure:

```text
G.Lab Calendar/
├── src/                    # Existing Next.js web app
├── mobile/                 # React Native / Expo Android app
├── packages/               # Added gradually when shared code is proven useful
│   ├── domain/
│   ├── schemas/
│   ├── api-client/
│   ├── shared-types/
│   └── utils/
└── existing backend / database
```

Do not convert the whole repository into a monorepo on day one. Start with `/mobile`, then extract shared packages incrementally.

## 3. Android technology stack

Recommended stack:

- React Native
- Expo
- TypeScript
- Expo Router
- React Native Reanimated
- React Native Gesture Handler
- FlashList
- TanStack Query
- Zustand
- React Hook Form
- Zod
- SecureStore
- MMKV where appropriate for high-speed local cache

The Android UI must use native React Native components. Do not embed the Next.js app in WebView.

## 4. Existing code to keep

The following parts of the current application should remain the source of truth:

- PostgreSQL database
- Drizzle ORM layer
- `src/server/services`
- scheduling/domain rules
- workspace / organization authorization
- Google Calendar integrations
- AI backend
- conflict validation
- timezone/date rules
- server-side business logic

The Android app must never connect directly to PostgreSQL.

## 5. API boundary for mobile

Create a stable authenticated JSON API for the Android app.

Planned areas:

```text
/api/v1/auth
/api/v1/calendar
/api/v1/shoots
/api/v1/clients
/api/v1/projects
/api/v1/crew
/api/v1/equipment
/api/v1/settings
/api/v1/google-calendar
/api/v1/ai
```

Each route should call existing application services instead of reimplementing business rules.

API requirements:

- workspace-scoped authorization
- consistent typed responses
- consistent typed errors
- pagination where needed
- calendar range queries
- validation with Zod
- no direct database writes from route handlers when an existing service exists

## 6. Shared code strategy

Good candidates for later extraction:

- TypeScript types
- Zod schemas
- scheduling overlap/conflict logic
- timezone/date helpers
- status definitions
- permission definitions
- API contracts
- AI command types
- pure domain rules

Do not share DOM-dependent UI code.

## 7. Web UI that will not be reused directly

The Android app should not attempt to reuse:

- Radix UI components
- shadcn web component implementations
- HTML/DOM components
- browser CSS/Tailwind output
- `@dnd-kit`
- web-specific Motion components

Android will have its own native component layer while preserving the same G.Lab product identity.

## 8. G.Lab mobile design language

Preserve the existing brand language:

- blush pink
- black
- white
- pink `*`
- large editorial typography
- soft rounded cards
- generous spacing
- clear hierarchy
- refined, minimal visual density

Android should feel like the same product, but interaction patterns should follow mobile-native behavior.

## 9. Main Android navigation

Initial bottom navigation concept:

```text
Calendar
Shoots
+
Clients
More
```

The center `+` opens a native quick-create sheet.

Screens should remain mounted or cached where appropriate so switching tabs feels immediate.

## 10. Calendar — highest-priority native module

The calendar must be implemented natively and optimized first.

Required views:

```text
Month
Week
Day
```

Core interactions:

- swipe left/right to change period
- tap shoot to open detail
- long press for contextual actions
- drag to reschedule where applicable
- native haptic feedback for important interactions

Month view should virtualize and preload nearby date ranges rather than rendering excessive data.

## 11. Calendar preload strategy

If the user is viewing October 2026, cache/preload approximately:

```text
September 2026
October 2026
November 2026
```

After movement, continue preloading the next adjacent range.

The UI should not wait for a full refetch every time the user swipes.

## 12. Week / Day timeline

Render a native timeline and only render visible or nearby content.

Use Gesture Handler + Reanimated for drag interactions so schedule movement can remain on the UI thread whenever possible.

Conflict validation remains authoritative on the server.

## 13. Shoot Detail mobile UX

Use progressive disclosure rather than reproducing a long desktop page.

Suggested structure:

```text
Shoot Hero
├── status
├── date/time
├── client
└── location

Schedule
Crew
Equipment
Checklist
Google Calendar
Notes
```

Sections can expand/collapse or open dedicated sheets/screens depending on complexity.

## 14. Create / Edit Shoot

Use mobile-native controls for:

- client
- project
- date
- start time
- end time
- location
- crew
- equipment

Use native date/time pickers and searchable bottom sheets.

Form validation should reuse shared Zod schemas where practical.

## 15. Local cache / offline behavior

Start with a pragmatic offline-first layer instead of building a full offline database immediately.

Cache locally:

- nearby calendar ranges
- recently viewed shoots
- clients
- crew
- equipment
- settings

Launch flow:

```text
Local cache
   ↓
Render immediately
   ↓
Background refresh
   ↓
Update visible data
```

## 16. Optimistic interactions

For safe reversible mutations, update the UI immediately and reconcile with the server.

Example reschedule flow:

```text
User drags shoot
   ↓
UI moves immediately
   ↓
API mutation
   ↓
Server validates scheduling rules
   ↓
Success → keep state
Error   → animate rollback + show domain error
```

## 17. Authentication

The current web app uses NextAuth. Mobile will require an explicit mobile authentication flow.

Planned requirements:

- Google OAuth
- mobile session/token flow
- secure token storage
- refresh/session renewal
- workspace resolution
- logout/revocation

Credentials/tokens should be stored using platform-secure storage.

## 18. Multi-user and workspace boundaries

Android must use the same ownership model as the web app:

```text
User
  ↓
Membership
  ↓
Workspace / Organization
  ↓
Shoots / Clients / Crew / Equipment
```

Every mobile API request must be scoped and authorized server-side.

## 19. Google Calendar architecture

Android should not implement an independent direct sync engine.

Use:

```text
Android app
   ↓
G.Lab API
   ↓
Existing Google Calendar service
   ↓
Google Calendar API
```

This keeps one sync authority and reduces duplicate/conflicting writes.

Any Google Calendar write/sync action must continue to respect existing safety rules and explicit user-triggered behavior.

## 20. Push notifications

Native Android enables proper push notifications for events such as:

- upcoming shoot
- shoot starting soon
- crew assignment
- schedule changes
- equipment conflict
- Google Calendar sync failure

Implementation candidate: Expo Notifications / Firebase Cloud Messaging.

## 21. AI integration

Keep AI execution server-side using the existing `src/server/ai` layer.

The mobile app supplies a native conversation/command UI and calls the same backend services.

AI must not bypass scheduling validation or workspace authorization.

## 22. Performance targets

Targets for the Android app:

| Interaction | Target |
|---|---:|
| Cold start | < 2 s where practical |
| Warm start | < 500 ms perceived |
| Tab switching | near-instant |
| Core animation | stable 60 fps |
| 120 Hz devices | take advantage where feasible |
| Cached calendar display | immediate |
| Tap feedback | immediate / <150 ms perceived |
| Calendar swipe | no full-page reload |

Performance should be measured on real mid-range Android devices, not only emulators or flagship phones.

## 23. Native interaction layer

Use mobile-native interaction patterns where they improve usability:

- spring animations
- bottom sheets
- swipe actions
- context menus
- haptic feedback
- pull to refresh
- skeleton states
- optimistic updates
- edge gestures

Animation should support usability and feedback rather than decorate every action.

## 24. Implementation phases

### Phase 0 — Architecture audit

- inventory existing server actions and route handlers
- identify API boundaries
- identify mobile auth requirements
- identify pure shared modules
- identify browser-only dependencies

### Phase 1 — Mobile API

- `/api/v1`
- authentication middleware
- workspace authorization
- typed response/error format
- pagination
- calendar range endpoint
- mobile-oriented integration tests

### Phase 2 — Native foundation

- create `/mobile`
- Expo / React Native setup
- Expo Router
- G.Lab design tokens
- typography
- theme primitives
- API client
- TanStack Query cache
- secure storage

### Phase 3 — Authentication

- Google login
- session persistence
- workspace selection/resolution
- account state
- logout

### Phase 4 — Calendar

- Month
- Week
- Day
- range preload
- caching
- navigation gestures
- shoot cards

### Phase 5 — Shoot workflows

- Shoot Detail
- Create Shoot
- Edit Shoot
- Client selection
- Crew assignment
- Equipment booking
- Checklist

### Phase 6 — Native interactions

- drag scheduling
- Reanimated transitions
- gestures
- bottom sheets
- haptics
- optimistic mutation/rollback

### Phase 7 — Product integrations

- Google Calendar controls/status
- AI
- notifications
- profile/settings

### Phase 8 — Production hardening

- Android signing
- app icon / splash
- crash reporting
- analytics
- performance profiling
- accessibility pass
- internal Play Store testing
- production release preparation

## 25. Screen implementation order

Recommended order:

```text
Login
  ↓
Calendar Month
  ↓
Calendar Week
  ↓
Calendar Day
  ↓
Shoot Detail
  ↓
Create/Edit Shoot
  ↓
Clients
  ↓
Crew
  ↓
Equipment
  ↓
Settings
  ↓
AI
```

## 26. Android MVP definition

The first usable native release should complete this real workflow:

```text
Login
  ↓
View calendar
  ↓
Open shoot
  ↓
Create shoot
  ↓
Edit shoot
  ↓
Assign crew/equipment
  ↓
Use existing Google Calendar sync controls
```

Once this loop is stable and fast on real Android hardware, expand secondary features.

## 27. Repository safety rules during Android development

- Keep the current Next.js web app operational.
- Do not rewrite existing backend services without a concrete need.
- Do not duplicate scheduling/business logic inside mobile.
- Do not allow mobile to access PostgreSQL directly.
- Do not perform automatic Google Calendar writes from background mobile behavior without explicit product rules.
- Keep Month / Week / Day and core web workflows regression-tested.
- Extract shared packages incrementally, only when duplication is proven.

## 28. Immediate next step

Do **not** begin Android implementation yet.

The next active work should be the remaining G.Lab Calendar web UI/UX refinement. Once the web UI and interaction model are stable, use this document as the implementation plan for the native Android phase.
