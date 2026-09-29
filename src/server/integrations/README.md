# Integrations Layer (`src/server/integrations`)

Adapters and clients for external services and future third-party APIs.

## Responsibilities

- Google Calendar sync adapter (`CalendarProvider` interface).
- Future notification adapters (email, push, messaging).

## Boundary Rules

- External provider IDs and synchronization metadata are kept separate from core scheduling entities.
- Must not leak third-party API types into the core domain model.
