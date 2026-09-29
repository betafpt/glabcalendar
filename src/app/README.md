# UI / Route Layer (`src/app`)

Next.js App Router directory hosting application routes, layouts, server actions, and route handlers.

## Responsibilities

- Render screens and collect user input.
- Perform schema validation at network boundaries (e.g. Zod).
- Invoke application services (`@server/services` or `@/server/services`) for all state mutations.
- Prefer React Server Components for data-heavy reads; isolate client interactivity in Client Components.

## Constraints

- Must not implement scheduling or business rules directly.
- Must not perform direct database queries bypassing the application service/repository layers.
