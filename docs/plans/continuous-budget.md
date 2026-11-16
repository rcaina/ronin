# Continuous budget and event budgets

Brief for `/feature start`. It replaces "one Budget row per month" with one
continuous budget broken up by month, plus event budgets (trips, vacations)
that sit inside or outside it. It ends with a roadmap of follow-up features
borrowed from Monarch, YNAB and Copilot.

Bank sync is out of scope here. Rules and the review inbox (Feature 3) are the
groundwork that makes sync worth adding later.

## Decisions already made

| Question                                     | Decision                                                                                                                                                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How many continuous budgets per account      | One                                                                                                                                                                                                         |
| Existing data                                | Only test data plus the owner's household. Preserve it with a backfill script if that is reasonable; wiping and reseeding is an acceptable fallback. Take a `pg_dump` before running anything against prod. |
| Card spending limits                         | Per month                                                                                                                                                                                                   |
| Rollover default                             | Off. A per-category toggle turns it on. When on, the category's remaining balance (positive or negative) carries into next month.                                                                           |
| Strategy (`ZERO_SUM`, `FIFTY_THIRTY_TWENTY`) | Stays on the budget, calculated per month from that month's income                                                                                                                                          |
| Event budget "within"                        | Funded by a category in the continuous budget. Its spending counts against that category in the month it happened.                                                                                          |
| Event budget "outside"                       | Not counted in the monthly budget. Optionally funded by a savings pocket.                                                                                                                                   |

## Open questions (raise at the plan stop)

- **Free plan limits.** `isBudgetWriteLocked` (`lib/api-services/entitlements.ts:87`)
  counts ACTIVE budgets. Suggested: free gets the continuous budget plus one
  active event; premium gets unlimited events.
- **Old period types.** `PeriodType` has `DAILY`, `WEEKLY`, `QUARTERLY`,
  `YEARLY`. Suggested: the continuous budget is `MONTHLY`, events are
  `ONE_TIME`, and the unused values are removed in the contract step once
  nothing references them.

## How it works today (ground truth)

- `Budget` (`prisma/schema.prisma:118`): `name`, `strategy`, `period`,
  `status` (ACTIVE/COMPLETED/ARCHIVED), `startAt`, `endAt`, plus categories,
  transactions and cards.
- A new month is a new Budget made by `duplicateBudget`
  (`lib/api-services/budgets.ts:665`, routes `src/app/api/budgets/duplicate`
  and `src/app/api/budgets/[id]/duplicate`, UI `components/budgets/DuplicateBudgetModal.tsx`).
- `Category` belongs to one budget. Copies link back to the original through
  `defaultCategoryId`. Its planned amount is `allocatedAmount`. Group is
  `NEEDS | WANTS | INVESTMENT`.
- `Card` is also copied per budget (`defaultCardId`) and has `spendingLimit`
  and a stored `amountSpent`. Cards have `userId` but no `accountId`.
- `Transaction.budgetId` is required. `occurredAt` is nullable;
  `getTransactionDate` (`lib/utils/spending.ts:108`) falls back to `createdAt`.
- Window math already exists in `lib/utils/spending.ts`: `DateWindow`,
  `calculateCategorySpentInWindow`, `calculateBudgetSpentInWindow`,
  `calculateTotalIncomeInWindow`. Month views should use these.
- Recurring posting (`lib/api-services/recurring.ts:164`,
  `postDueOccurrencesForTemplate`) picks the ACTIVE budget whose dates cover
  the occurrence, and holds the occurrence if none does.
- CSV import (`src/app/api/transactions/import/route.ts`) takes a `budgetId`.
- Notifications (`lib/utils/notifications.ts`) have a "budget period ending"
  trigger, and category alerts dedupe per category on the assumption that a
  category belongs to one period.
- Reports derive their window from budgets (`deriveWindowFromBudgets`,
  `lib/utils/reports.ts:163`).
- Savings: `Savings` has `Pocket`s (`goalAmount`, `goalDate`), and money moves
  through `Allocation` rows.
- Budget creation is a multi-step modal (`components/budgets/CreateBudgetModal.tsx`
  with Basic, Income, Categories, Allocation or Percentage, Cards steps).
- The budgets list (`src/app/budgets/page.tsx`) has Active, Completed and
  Archived tabs.
- Deploy path: feature branch → PR into `dev` (`migrate-dev.yml` migrates the
  dev DB) → PR `dev` into `main` (`migrate-production.yml` runs
  `pnpm db:migrate` on prod). CI runs `pnpm check` and `pnpm test`.

## Target model (a starting point; the plan may refine it)

- `Budget.kind`: `CONTINUOUS` (one per account, `endAt` null, always ACTIVE)
  or `EVENT` (start and end dates, uses the status tabs).
- New `CategoryMonth`: `categoryId`, `month` (first day of the month, UTC
  date), `assigned`. Unique on `(categoryId, month)`. A month with no row
  falls back to `Category.allocatedAmount`, which becomes the default.
- `Category.rollover Boolean @default(false)`.
- One set of categories and one set of cards on the continuous budget, with
  no per-month copies. Card `spendingLimit` applies per month; card spent is
  derived per month, not stored.
- A transaction's month is derived from `getTransactionDate`, never stored.
- Event budgets: `Budget.fundingCategoryId` (within) or
  `Budget.fundingPocketId` (outside, optional). Event categories use
  `allocatedAmount` with no months. Each transaction still belongs to exactly
  one budget, so `spending.ts` math is unchanged; the month view adds
  "within" event spending to its funding category.
- Ready to assign (zero-sum only): that month's income minus that month's
  total assigned.

Pure rules go in `lib/utils/` with Vitest tests: month windows, assigned with
fallback, rollover carry, ready to assign, 50/30/20 targets per month, event
roll-up into the funding category.

## Feature 1: continuous monthly budget

Start with: `/feature start continuous monthly budget, see Feature 1 in docs/plans/continuous-budget.md`

Suggested slices (the plan stop may re-slice):

1. **Month view.** Add `kind` and `CategoryMonth`. Create or get the account's
   continuous budget. The budget page gets a month switcher (previous, next,
   jump to current) showing planned, spent and remaining per category for
   that month, reusing the existing category grid and list views.
2. **Plan a month.** Edit a category's planned amount for one month. Quick-fill
   for a month: copy last month, average of the last 3 months, or last
   month's actual spending.
3. **Rollover and strategy.** Per-category rollover toggle, carried balance
   shown in the month view. Ready to assign for zero-sum budgets; 50/30/20
   targets from the month's income.
4. **Cards.** One set of cards on the continuous budget, with monthly limits
   and spent derived per month.
5. **Point everything at the continuous budget.** Recurring posting, CSV
   import, receipt scan, transaction forms, notifications (per-month dedupe;
   drop "period ending" for the continuous budget), reports and entitlements.
6. **Move existing data and retire monthly duplication.** Backfill script
   `scripts/migrate-to-continuous-budget.ts` with `--dry-run`, idempotent:
   per account, merge MONTHLY budgets into the continuous budget (match
   categories through `defaultCategoryId`, falling back to name plus group;
   match cards through `defaultCardId`, falling back to name plus last four),
   write one `CategoryMonth` per old budget per category from its
   `allocatedAmount`, repoint transactions and recurring templates, and turn
   every other budget into an EVENT. Remove the monthly duplicate flow and
   restructure the budgets list (monthly budget on top, events below with the
   status tabs).

Later, a separate contract migration drops what nothing reads anymore
(`defaultCategoryId`, `defaultCardId`, `Card.amountSpent`, unused period types).

## Feature 2: event budgets

Start with: `/feature start event budgets, see Feature 2 in docs/plans/continuous-budget.md`

1. Create an event (name, dates, its own categories and planned amounts) and
   list events on the budgets page.
2. "Within": choose a funding category; the month view rolls event spending
   into it.
3. "Outside": optionally fund it from a savings pocket; show what's left.
4. Transaction entry, import and recurring templates can target an event.

## Roadmap after that (one `/feature` each)

3. **Rules and review inbox.** "Name contains X → category Y", applied on
   import, receipt scan and manual entry. New, imported and auto-posted
   transactions wait in a "to review" list until confirmed. This is the
   groundwork for bank sync (SimpleFIN first).
4. **Bills calendar and safe-to-spend.** Upcoming recurring transactions on a
   calendar; this month's income minus planned amounts minus upcoming bills.
5. **Sinking funds.** For a pocket with a goal amount and date, show the
   monthly amount needed and offer it as a category's planned amount.
6. **Tags and monthly recap.** Cross-category tags (reimbursable, gifts), and
   a planned-vs-actual summary sent through notifications at month end.
