---
description: Run the Vitest suite and fix any failures
---

Run the test suite and get it green:

1. Run `pnpm test` (Vitest, non-watch).
2. If anything fails, read the failing test and the source it exercises, decide whether the test or the code is wrong, and fix the right one. Spending semantics are defined in `lib/utils/spending.ts` and CLAUDE.md — RETURN reduces spending; INCOME and CARD_PAYMENT are money movement, not spending.
3. To iterate on a single area, use `pnpm exec vitest related --run <file>` or `pnpm exec vitest run <pattern>` instead of the full suite.
4. When tests pass, also run `pnpm check` before considering the work done.

$ARGUMENTS
