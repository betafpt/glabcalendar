# Application Services (`src/server/services`)

Application use cases orchestrating business operations across domain rules and repositories.

## Responsibilities

- Orchestrate use cases (e.g., shoot creation, crew assignment, equipment booking).
- Execute domain scheduling conflict validation prior to persistence.
- Enforce organization boundary checks and transactional integrity.
- Return typed result objects with domain errors (`NOT_FOUND`, `VALIDATION_ERROR`, conflict errors).

## Boundary Rules

- Shared interface for UI actions, Route Handlers, APIs, and future AI commands.
- Mutations must never bypass application service validation.
