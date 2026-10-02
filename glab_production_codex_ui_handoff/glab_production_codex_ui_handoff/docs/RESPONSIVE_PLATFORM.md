# Responsive & Platform Strategy

## Goal
Keep one visual language while supporting Android mobile first and web later.

## Mobile / Android
Primary breakpoint: ~360–480dp.

Rules:
- respect status/navigation safe areas
- 44–48dp minimum tap targets
- sticky bottom nav
- bottom sheets preferred for secondary flows
- avoid iOS-only gestures as required actions
- use platform haptics only as enhancement

## Tablet
~600–1024dp.

Adaptation:
- 2-column layouts for list + detail where useful
- larger calendar timeline
- navigation may remain bottom bar in portrait, switch to rail in landscape

## Desktop / Web
>= 1024px.

Adaptation:
- left rail/sidebar replacing bottom navigation
- content area may become 2–3 columns
- calendar uses available width for denser event layout
- hover states become available but must not be required
- retain same colors, typography, radius and cards
- use max-width for detail forms to avoid overly wide text

## Technology guidance
If current project is web-first:
- React + TypeScript
- Next.js if already chosen
- CSS variables / Tailwind theme for tokens
- Framer Motion or Motion One for motion if allowed

If true native Android/iOS is required later:
- preserve domain/data layer and design tokens
- mirror components in React Native/Expo
- React Native Reanimated for native motion

Do not force the exact web DOM implementation into React Native. Share tokens, interaction specs, view models and business logic where practical.
