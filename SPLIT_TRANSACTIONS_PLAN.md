# Split Transactions Plan

One receipt = **one transaction**, with its amount allocated across multiple categories.
Replaces the current behavior where `ReceiptReview` saves one transaction _per category_
via `POST /api/transactions/batch`.

Status: **awaiting approval — do not implement until approved.**

---

## 1. Design decision

Two candidate models were considered:

**A. Group marker (`splitGroupId` on Transaction).** Keep N per-category rows, tag them
with a shared group id, and merge them visually in lists. Spending math stays untouched,
but "one transaction" is a UI illusion: every list surface needs grouping logic,
server-side pagination can cut a group across page boundaries, transaction counts are
inflated, and editing "the transaction" means coordinating N rows.

**B. Parent transaction + `TransactionSplit` child rows.** ✅ **Chosen.**
One `Transaction` row holds the receipt (merchant, card, date, `amount` = grand total,
`categoryId = null`), and child `TransactionSplit` rows hold `{categoryId, amount, note}`.

Why B is optimal here:

- Lists, pagination, delete, and edit are naturally "one transaction" — no grouping hacks.
- The parent carries the full amount, so any flat sum over a transaction list stays correct.
- Category spending is the only math that changes, and this repo centralizes all of it in
  `lib/utils/spending.ts` (per CLAUDE.md, nothing re-derives spent/remaining inline), so
  the change lands in one helper module plus a handful of Prisma `include`s.
- Matches the standard pattern in YNAB/Monarch/Lunch Money; leaves room for future
  receipt-image attachment on the parent.
- Precedent in this schema: `CARD_PAYMENT` already uses a two-row linked structure;
  splits get their own child table rather than overloading `linkedTransactionId`.

## 2. Invariants (enforce in the service layer, not just the client)

1. A transaction has **either** `categoryId` **or** `splits` (never both):
   - Simple transaction: `categoryId` set, zero splits.
   - Split transaction: `categoryId = null`, **≥ 2** splits.
2. `roundToCents(sum(splits.amount)) === roundToCents(transaction.amount)` — reject with 400 otherwise.
3. Splits allowed only on `REGULAR` and `RETURN` types (never `INCOME` / `CARD_PAYMENT`).
4. Every split `categoryId` must belong to the transaction's budget (same validation
   posture as `scanReceipt`, which drops model-supplied ids not in the budget).
5. Split amounts must be `> 0`; money math goes through `roundToCents`.

## 3. Schema (Phase 1)

`prisma/schema.prisma`:

```prisma
model TransactionSplit {
    id            String      @id @default(cuid())
    transactionId String
    transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
    categoryId    String
    category      Category    @relation(fields: [categoryId], references: [id])
    amount        Float
    note          String?     // e.g. "Milk, Bread • incl. $1.12 tax/fees"

    @@index([transactionId])
    @@index([categoryId])
    @@map("transaction_splits")
}
```

- Add `splits TransactionSplit[]` to `Transaction`, `transactionSplits TransactionSplit[]` to `Category`.
- Use the `db-migrate` skill to generate the migration. No backfill: existing
  receipt-created rows remain separate transactions (see §9).
- Soft delete stays on the parent only; splits are always queried through their parent
  (or filtered by `transaction: { deleted: null }`), and hard-delete cascades.

## 4. API layer (Phase 2)

### Schemas — `lib/api-schemas/transactions.ts`

- `transactionSplitInputSchema = z.object({ categoryId: z.string().min(1), amount: z.number().positive(), note: z.string().optional() })`
- `createTransactionSchema`: add `splits: z.array(transactionSplitInputSchema).min(2).optional()`,
  with a `.superRefine` enforcing categoryId/splits mutual exclusion, sum === amount
  (cent tolerance via `roundToCents`), and type ∈ {REGULAR, RETURN} when splits present.
- `updateTransactionSchema`: same optional `splits`. Semantics: `splits` present →
  **replace all** splits and force `categoryId = null`; `categoryId` present (non-empty) →
  delete all splits. Validate sum against the (possibly updated) `amount` — the service
  must read the existing row when `amount` isn't in the payload.

### Services — `lib/api-services/transactions.ts`

- `createTransaction`: validate budget ownership of split categories
  (`category.findMany({ where: { id: { in }, budgetId, deleted: null } })`), then create
  parent + `splits: { createMany }` in one call. Always `include` splits + their category.
- `updateTransaction`: inside the caller's `prisma.$transaction`; replace-splits =
  `deleteMany` + `createMany`. Re-check invariants against the final state.
- `deleteTransaction`: unchanged (soft delete on parent hides splits everywhere).
- `getTransactions`: add `splits: { include: { category: { include: { defaultCategory: true } } } }` to the `include`.
- Keep `POST /api/transactions/batch` as-is for now (other callers / API compatibility);
  the receipt flow stops using it.

### Types — `lib/types/transaction.ts`

- `TransactionWithRelations` gains `splits?: (TransactionSplit & { category: Category & {...} })[]`.
- `CreateTransactionRequest` / `UpdateTransactionRequest` gain `splits?: { categoryId: string; amount: number; note?: string }[]`.

## 5. Spending math (Phase 2 — highest-risk area, audit carefully)

`lib/utils/spending.ts`:

- New shape: `SpendingSplit { amount: number; transaction: SpendingTransaction }`.
- `SpendingCategory` gains `transactionSplits?: SpendingSplit[] | null`.
- New helper `getSplitSpending(split)` — applies the parent's type sign to the split
  amount (`RETURN` → negative, `REGULAR` → positive; INCOME/CARD_PAYMENT impossible by invariant).
- `calculateCategorySpentInWindow`: current sum **+** splits whose _parent_ passes
  `isWithinWindow` (window fields come from the parent).
- `flattenBudgetTransactions`: must also surface split **parents exactly once** (dedupe by
  id — a Map keyed by transaction id), since parents have `categoryId = null` and appear in
  no category's `transactions`. Audit every caller (recent-spending, weekday-average charts)
  to confirm "count parent once at full amount" is the correct semantic for each.
- No double counting by construction: split parents never appear in `category.transactions`
  (their `categoryId` is null), and splits never appear at budget-flat level.

**Prisma include audit** — every place that fetches `categories: { include: { transactions } }`
must add `transactionSplits: { where: { transaction: { deleted: null } }, include: { transaction: true } }`:

- `lib/api-services/budgets.ts` (~lines 47, 504, 629 — grep for `transactions: {` and audit all).
- `src/app/api/budgets/[id]/transactions/route.ts` and any category-scoped queries.

⚠️ **Known trap:** `lib/api-services/budgets.ts:62` fetches budget-level
`transactions: { where: { categoryId: null } }` ("card payments / income"). Split parents
now match that filter. Audit every consumer of that list — income math filters on
`transactionType === INCOME` so it's safe, but verify nothing else sums or displays that
list assuming "no category = money movement".

**Tests (Vitest, colocated like `lib/utils/entitlements.test.ts`):**

- Category spent with mixed plain + split transactions; RETURN splits reduce spending.
- Window filtering uses the parent's date for splits.
- Budget total = sum of category totals = flat sum of parents (consistency check).
- `flattenBudgetTransactions` counts a split parent exactly once.

## 6. Receipt flow (Phase 3)

`components/transactions/ReceiptReview.tsx`:

- `handleSave` builds **one** `CreateTransactionRequest`:
  - `amount: allocation.grandTotal`, `name: merchant`, `categoryId: undefined`,
  - `splits`: one per `allocation.categories` entry with a real `categoryId`
    (`amount: c.total`, `note`: item list + "incl. $X tax/fees" — reuse the existing
    description-building logic per split),
  - `description`: short receipt summary (e.g. "Receipt · 12 items").
  - **Single-category receipts stay plain** (no splits, `categoryId` set directly) —
    don't create 1-split transactions.
- Switch from `useCreateTransactionsBatch` to `useCreateTransaction` (its invalidation
  set already covers transactions/budget/categories/cards keys).
- Copy changes: summary panel says "1 transaction · split across N categories"; save
  button "Save transaction". Keep the per-category breakdown UI as-is (it becomes the
  split preview). `allocateReceipt` and its proportional tax logic are unchanged.

## 7. Display & editing surfaces (Phase 4)

Grep for `TransactionWithRelations` consumers; known surfaces:

| Surface                                                                                                   | Change                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/transactions/page.tsx`                                                                           | Category cell: "Split · N categories" badge (amber-style, like existing badges via `getCategoryBadgeColor`); expandable row (chevron) revealing per-split rows: category badge, note, amount.                                                                          |
| `src/app/budgets/[id]/transactions/page.tsx`                                                              | Same treatment.                                                                                                                                                                                                                                                        |
| `src/app/page.tsx` (dashboard recent)                                                                     | Show parent once, total amount, "Split" badge. No expansion needed.                                                                                                                                                                                                    |
| `src/app/budgets/[id]/cards/[cardId]/page.tsx`                                                            | Parent shows once at full amount (card math already correct — amount/cardId live on the parent).                                                                                                                                                                       |
| Budget page category cards (`src/app/budgets/[id]/page.tsx`)                                              | A category's transaction list shows the **split portion** for that category with a small "split" indicator (portion amount, parent merchant name).                                                                                                                     |
| `components/transactions/TransactionForm.tsx`                                                             | Add "Split across categories" toggle (REGULAR/RETURN only): rows of category + amount + note, add/remove row, live "remaining to allocate" indicator, save disabled until remainder is $0.00. Editing a split transaction opens with split mode on and rows populated. |
| `components/transactions/InlineTransactionEdit.tsx`, `components/budgets/BudgetTransactionInlineEdit.tsx` | Keep inline editors simple: for split transactions, show read-only summary + "Edit split" that opens the full form modal.                                                                                                                                              |
| `components/transactions/TransactionFiltersModal.tsx`                                                     | Category filter matches a transaction if `categoryId` matches **or** any split's `categoryId` matches.                                                                                                                                                                 |
| Delete flows                                                                                              | Unchanged — deleting the parent removes the whole receipt. `DeleteConfirmationModal` copy should mention "and its N category splits".                                                                                                                                  |

UI rules: follow DESIGN.md; everything must work at 375px (expandable split rows stack
vertically on mobile); toasts on mutation success/failure as usual.

## 8. Phasing for implementation agents

Each phase is a reviewable unit; run `pnpm check` after each.

1. **Schema + types + zod** — Prisma model, migration (`db-migrate` skill), shared types, schema validation incl. unit tests for the refinements.
2. **Server** — services, route includes, spending.ts + include audit (§5), Vitest coverage. _Blocks on 1._
3. **Receipt flow** — ReceiptReview single-transaction save + copy. _Blocks on 2._
4. **Display & edit surfaces** — table stakes first (list rendering, filters, delete copy), then TransactionForm split editor. _Blocks on 2; parallel with 3._
5. **Verification** — `pnpm check`, `pnpm test`, manual verify: scan → review → save → check budget/category/card/dashboard numbers reconcile; edit a split; delete a split transaction; 375px pass; run the `design-review` agent on UI changes.

## 9. Explicitly out of scope (v1)

- **Backfill/migration of historical receipts** (merging old per-category rows into splits). Old data stays as-is and remains correct.
- **Splitting across budgets or cards** — a split is categories-within-one-budget only.
- **Receipt image storage** on the parent transaction (future; model leaves room).

## 10. Decisions made (veto if wrong)

1. **Manual splits included**: the TransactionForm split editor ships in v1 — it's required
   anyway to edit a saved receipt, and creating a manual split falls out of the same UI.
2. **Not premium-gated**: receipt _scanning_ is already gated by `canScanReceipt`; the split
   data model itself stays free (manual splits available to all plans).
3. **Batch endpoint kept** but no longer used by the receipt flow.
