# Ronin — household budgeting app

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 3 + Prisma/Postgres.
Data fetching via TanStack Query hooks; auth via NextAuth v5 (beta); charts via Recharts.
Package manager is **pnpm**.

## Commands

- `pnpm dev` — dev server (turbo)
- `pnpm check` — lint + typecheck (run before considering work done)
- `pnpm typecheck` / `pnpm lint:fix`
- `pnpm db:generate` (migrate dev), `pnpm db:push`, `pnpm db:seed`, `pnpm db:studio`

## Layout of the code

- `src/app/` — routes (App Router). Pages are `"use client"` components that call
  data hooks; no server components fetch data directly.
- `src/app/api/` — REST-ish route handlers backed by Prisma.
- `components/` — shared UI (root) and per-domain folders: `budgets/`, `cards/`,
  `categories/`, `savings/`, `transactions/`, `recharts/`.
- `lib/data-hooks/` — TanStack Query hooks (one folder per domain). Mutations
  invalidate their domain's query keys.
- `lib/types/` — shared TypeScript types (e.g. `BudgetWithRelations`).
- `lib/utils/` — pure helpers. Money math goes through `roundToCents` /
  `formatCurrency`; spending calculations live in `lib/utils/spending.ts` — reuse
  them, never re-derive spent/remaining math inline.
- `prisma/` — schema, migrations, seed.

## Conventions

- **Design system: follow `DESIGN.md` for ALL UI work** — colors, surfaces, charts,
  motion, and mobile rules live there. Don't invent new visual patterns.
- Mobile first: every UI change must work at 375 px width with the bottom tab bar.
- App shell: `components/ConditionalLayout.tsx` (auth gate + nav chrome),
  `SideNav` (desktop), `MobileHeader` + `MobileBottomNav` (mobile).
- Transaction semantics: `RETURN` reduces spending; `INCOME` and `CARD_PAYMENT`
  are money movement, not category spending (see `lib/utils/spending.ts`).
- Category groups are `NEEDS | WANTS | INVESTMENT` (`CategoryType` from Prisma).
- Budgets have statuses (active/completed/archived) surfaced as tabs.
- Toasts via `react-hot-toast` on every mutation success/failure.
- Path alias `@/` maps to the repo root.

## Gotchas

- `Button`, `StatsCard`, `PageHeader`, `DeleteConfirmationModal` are the shared
  primitives — extend them rather than duplicating styles.
- Chart colors/tooltips come from `components/recharts/theme.tsx`; pages must not
  hardcode hex values.
- `prettier-plugin-tailwindcss` enforces class order — run `pnpm format:write` if
  lint complains about class sorting.
