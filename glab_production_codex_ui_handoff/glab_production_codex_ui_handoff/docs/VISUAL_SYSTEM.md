# Visual System

## 1. Brand character

Editorial fashion magazine + production utility.

The UI should feel creative, premium, visual and fast — not corporate or enterprise-heavy.

## 2. Color system

Suggested tokens derived from the approved references:

- `bg/blush`: `#FFF1F6`
- `surface/default`: `#FFF9FB`
- `ink/primary`: `#090909`
- `ink/secondary`: `#5F5960`
- `accent/pink`: `#FF4F9A`
- `accent/lilac`: `#DCD5FF`
- `accent/mint`: `#CFF7E7`
- `accent/yellow`: `#FFE89A`
- `accent/sky`: `#CDE7FF`
- `accent/coral`: `#FFC3D2`
- `state/success`: `#34C982`
- `state/warning`: `#F4B942`
- `state/error`: `#F0445E`
- `stroke/subtle`: `#EADDE4`

Use pastel colors as semantic grouping/context, not decoration everywhere.

## 3. Typography

### Display / Page title
- Extra-condensed / condensed heavy sans.
- All caps for major page titles: TODAY, PROJECTS, CREW, GEAR, CHECKLIST, CALENDAR.
- Very high visual weight.
- Tight leading.
- Mobile target size: ~46–64sp depending on title length.

Recommended implementation approach:
- Use an open/licensed condensed display font available to the project.
- Fallback: `Impact`, `Arial Narrow`, condensed sans fallback.
- Keep the font family configurable through tokens so it can be swapped later.

### UI text
- Neutral modern sans.
- Medium/bold for event titles.
- Small uppercase/tracked meta labels.

## 4. Spacing

Base grid: 4px.
Main rhythm: 8px.

Mobile horizontal page padding: 16–20px.
Card inner padding: 12–16px.
Section spacing: 20–28px.

## 5. Shape language

- Cards: radius 18–24px.
- Compact chips: fully rounded / 999px.
- Buttons: 18–999px depending on size.
- Image thumbnails: 12–18px.
- Bottom navigation: large capsule with internal circular active state.

## 6. Iconography

- Thin/medium line icons.
- Avoid filled icon set except active states or high-priority CTA.
- Standardize 20 / 24px sizes.

## 7. Elevation

The references rely primarily on color blocks, spacing and borders — not deep shadows.

Use:
- subtle 1px stroke,
- restrained soft shadow only for floating/nav/sheets,
- no glassmorphism.

## 8. Content density

Cards may contain image + title + metadata + avatars + chip + chevron, but hierarchy must be immediately scannable.

Never reduce cards to generic rectangles with rows of text.
