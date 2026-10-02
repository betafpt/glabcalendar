# Motion & Interaction Specification

## Motion character
Fast, editorial, tactile, direct.

No long cinematic animation in productivity flows.

## Timing
- Press feedback: 90–140ms
- Chip/filter state: 160–220ms
- Card/list transition: 180–260ms
- Page transition: 220–300ms
- Bottom sheet: 260–340ms spring
- Progress bar fill: 300–500ms

## Easing
For CSS/Web:
- standard: `cubic-bezier(0.2, 0.8, 0.2, 1)`
- exit: `cubic-bezier(0.4, 0, 1, 1)`

For spring-capable native libraries:
- medium damping
- minimal overshoot

## Required interactions

### Buttons
- scale to ~0.96–0.98 on press
- return with spring

### Cards
- optional subtle lift/scale on press
- list → detail should feel spatially connected

### Filter chips
- animated background + text color
- selected indicator morph rather than hard redraw

### Bottom navigation
- active item uses moving capsule/circle
- 180–240ms

### Add button
- subtle pulse only when screen is idle/new user hint; never continuous indefinitely

### Calendar drag
- selected event lifts ~1–2%
- shadow/elevation appears
- destination slot highlights
- haptic feedback on native where available
- snap animation on drop

### Conflict
- no constant flashing
- initial short shake/pulse only when conflict is created or first revealed
- keep persistent red/coral visual state afterward

### Checklist
- checkbox morph/scale
- progress animates to new value
- optional micro-confetti only on 100% completion, very restrained

### Sheet/modal
- background scrim
- sheet springs from bottom on mobile
- web may use popover/dialog depending on context

## Accessibility
- support reduced motion
- maintain usable UI with all animations disabled
- never convey status by animation alone
