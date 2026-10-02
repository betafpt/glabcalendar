# G.LAB Production — Agent Rules

## Role split
- Codex = architect, planner, reviewer, QA owner.
- Implementation agent = code only within assigned scope.
- Codex must inspect visual references before UI implementation or review.

## Visual source of truth
Read these first:
1. `reference/primary/01_approved_gear_and_gear_detail.png`
2. `reference/primary/02_approved_new_shoot_and_checklist.png`
3. `reference/primary/03_approved_calendar_and_projects.png`
4. `reference/primary/04_approved_crew_and_crew_detail.png`

Primary references outrank secondary mockups when visual decisions conflict.

## Required implementation behavior
- Build real interactive components, not static screenshots.
- Reuse design tokens and primitives.
- Preserve mobile visual identity on Android and web.
- Avoid generic Material Design appearance.
- Avoid generic dashboard/SaaS styling.
- Avoid excessive shadows, gradients, glassmorphism, neon, or dark mode unless explicitly requested.
- Do not replace bold condensed editorial headings with generic sans-serif headings.

## QA ownership
After every user-facing task Codex must:
1. Run app.
2. Open headed browser / device preview.
3. Compare against the relevant reference image.
4. Test taps, scrolling, filters, modals/sheets, forms and transitions.
5. Run lint/typecheck/tests/build as applicable.
6. Request a focused fix if the implementation drifts visually or behaviorally.
7. Do not approve the task until visual + interaction QA passes.
