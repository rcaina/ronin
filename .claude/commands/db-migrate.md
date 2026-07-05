---
description: Make a Prisma schema change and generate a migration safely
---

Apply a database schema change: $ARGUMENTS

1. Edit `prisma/schema.prisma` with the requested change. Follow existing naming conventions (model casing, relation naming, `@@map` usage as seen in the file).
2. Never edit an already-applied migration under `prisma/migrations/` — always create a new one.
3. Run `pnpm db:generate` (prisma migrate dev) with a descriptive `--name` in snake_case.
4. Read the generated migration SQL and check for destructive operations (DROP COLUMN, DROP TABLE, type changes that lose data). If any are present, stop and flag them to the user before anything runs against a shared database — `.github/workflows/migrate-production.yml` deploys migrations to production on main.
5. If the change affects seed data expectations, update `prisma/seed.ts`.
6. Update the corresponding types in `lib/types/` and any affected Zod schemas in `lib/api-schemas/`, then run `pnpm check`.
