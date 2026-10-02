# QA & Acceptance Criteria

## Visual acceptance
A screen does not pass merely because the same information exists.

It must match the reference language in:
- overall silhouette
- heading size/weight
- vertical rhythm
- card geometry
- pastel palette usage
- navigation treatment
- content density
- image/thumbnail placement
- chip/avatar treatment

## Functional acceptance
- navigation works
- buttons/taps have feedback
- forms are editable and validated
- filters work
- calendar selection works
- drag/reschedule works when implemented
- conflict UI is driven by state, not hard-coded visual decoration
- checklist progress derives from item state

## Responsive acceptance
Test at least:
- 360x800
- 390x844
- 412x915
- tablet ~768x1024
- desktop 1440px wide

## Accessibility
- sufficient text contrast
- minimum tap targets
- keyboard accessible web UI
- semantic labels
- screen-reader labels on icon-only controls
- reduced-motion behavior

## Performance
- avoid animating large offscreen lists
- virtualize long resource lists where needed
- optimize image loading
- avoid layout thrash during calendar drag

## Codex headed QA prompt

After implementation, use the in-app headed browser/device preview and compare each affected route directly against the corresponding file in `reference/primary/`.

For every mismatch, classify it as:
- typography
- spacing
- color
- shape
- hierarchy
- imagery
- interaction
- responsive

Fix visual mismatches before marking the task complete.
