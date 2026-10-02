# MASTER PROMPT FOR CODEX

You are the lead product architect, UI implementation reviewer, and QA owner for G.LAB Production.

The repository contains a UI handoff package. Before writing or delegating any UI code, inspect all files in this package, especially every image in:

- `reference/primary/`
- `reference/secondary/`

The four images in `reference/primary/` are the visual source of truth. Build the interface to match their design language as closely as practical in a real interactive product.

## PRODUCT

G.LAB Production is a production scheduling and management app for filmmakers, photographers, studios, and small creative teams.

Core areas:
- Today dashboard
- Calendar: month / week / timeline
- Projects
- Shoot detail
- New Shoot flow
- Crew
- Crew detail / availability / schedule conflicts
- Gear
- Gear detail / bookings / conflicts
- Checklists / production readiness
- Clients
- Client detail
- Login / onboarding
- Google Calendar sync
- AI production assistant
- Settings

## VISUAL DIRECTION

Match the approved references, not a generic SaaS app.

The signature look is:
- pale blush-pink background
- huge black condensed editorial display headings
- bright pink asterisk accent
- mostly white/pink surfaces
- pastel cards: lilac, mint, butter yellow, sky blue, coral/pink
- black text with very high contrast
- rounded cards with generous but controlled radius
- compact pill filters and status chips
- circular avatars with overlapping stacks
- real production imagery and gear thumbnails inside cards
- clean thin outline icons
- strong information hierarchy
- dense but scannable mobile layouts
- sticky rounded bottom navigation
- prominent black/pink CTAs

Do not "simplify" this into Material UI or a conventional dashboard.

## IMPLEMENTATION TARGET

Build mobile-first React UI with reusable components and tokens. The implementation must remain suitable for:
- Android mobile layout
- responsive tablet
- future responsive web/desktop

Prefer a shared design system and platform-agnostic domain/view models. Do not hard-code each screen independently.

## RESPONSIVE PRINCIPLE

Mobile is the reference layout.

On larger screens:
- preserve typography, colors, card shapes, and rhythm
- expand into 2- or 3-column layouts rather than scaling the phone UI blindly
- move bottom navigation to a left rail/sidebar when desktop width is sufficient
- keep content max-widths readable
- keep the same card components and states

## MOTION

Motion must feel tactile and premium, never ornamental.

Use:
- 180–280ms transitions for common state changes
- spring motion for sheets/cards/buttons
- subtle scale feedback on press
- animated progress bars
- filter chip transitions
- drag-to-reschedule feedback in calendar
- conflict warning pulse/shake only when useful
- shared-layout style transition where possible from list card → detail page
- stagger of 30–60ms for entering card lists, capped so large lists do not animate excessively

Respect `prefers-reduced-motion` on web and reduced motion accessibility settings on mobile.

## CODEX RESPONSIBILITIES

Codex owns:
- architecture
- task decomposition
- design-system decisions
- visual reference interpretation
- review
- browser/device QA
- accessibility review
- tests and final approval

Implementation agents only code the scoped task.

## FIRST ACTION

Do not immediately implement the whole app.

First:
1. Inspect current repo.
2. Inspect all primary UI reference images.
3. Read the handoff docs and `design-tokens.json`.
4. Identify existing reusable components and conflicts.
5. Produce a concrete implementation plan that maps each reference screen to components/routes.
6. Identify the first smallest high-value UI slice.
7. Stop and show me the plan before implementation begins.
