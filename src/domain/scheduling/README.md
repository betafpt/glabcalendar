# Scheduling Domain (`src/domain/scheduling`)

Pure domain logic and types for temporal scheduling, interval calculations, and conflict detection.

## Responsibilities

- Half-open interval overlap calculation `[A_start, A_end)` vs `[B_start, B_end)`:
  `A_start < B_end && B_start < A_end`
- Adjacent intervals (where `A_end === B_start`) do not overlap.
- Crew and equipment scheduling conflict evaluation rules.
- Pure domain types and error definitions (`CREW_SCHEDULING_CONFLICT`, `EQUIPMENT_BOOKING_CONFLICT`).

## Constraints

- Pure computation only; no database access or framework dependencies.
