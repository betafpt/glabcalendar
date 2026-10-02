# Component Library

Build these as shared primitives / composites.

## Primitives
- AppScreen
- EditorialPageTitle
- AsteriskAccent
- IconButton
- PrimaryButton
- BottomCTA
- Pill
- StatusChip
- FilterChip
- Avatar
- AvatarStack
- Thumbnail
- ProgressBar
- SectionHeader
- MetaLabel
- Divider
- EmptyState
- Skeleton

## Composite components
- BottomNavigation
- FloatingAddButton
- WeekDateStrip
- MonthGrid
- TimelineGrid
- EventCard
- TimelineEventBlock
- ProjectCard
- CrewCard
- CrewAvailabilityStrip
- GearCategorySection
- GearItemTile
- GearBookingTimeline
- ConflictBanner
- ChecklistRow
- ShootSummaryCard
- ClientCard
- SettingsRow
- IntegrationCard
- AIQuickAction
- AIProposalCard

## State coverage
Every interactive component should support:
- default
- pressed
- selected
- disabled
- loading where applicable
- error/conflict where applicable

## Reuse requirement
Never duplicate event-card or status-chip styling separately per page. Build once and parameterize content/state.
