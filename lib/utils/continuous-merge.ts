import { BudgetStatus, type CategoryType } from "@prisma/client";
import { roundToCents } from "@/lib/utils";
import { toMonthKey, type MonthKey } from "@/lib/utils/budget-month";

export interface MergeCategory {
  id: string;
  name: string;
  group: CategoryType;
  defaultCategoryId: string | null;
  allocatedAmount: number | null;
  createdAt: Date;
}

export interface MergeCard {
  id: string;
  name: string;
  lastFourDigits: string | null;
  defaultCardId: string | null;
}

export interface MergeSourceBudget<C, D> {
  startAt: Date;
  status: BudgetStatus;
  categories: C[];
  cards: D[];
}

/** Rows from the merged budgets that become one row of the continuous budget. */
export interface MergeGroup<T> {
  /** The continuous budget's existing row, or null when one must be created from `template`. */
  targetId: string | null;
  /** The latest merged budget's row. */
  template: T;
  sourceIds: string[];
}

export interface CategoryMergeGroup<C> extends MergeGroup<C> {
  /** Earliest createdAt among the merged rows, for a category that must be created. */
  firstCreatedAt: Date;
  /** Planned amount per merged month from the month's plan budget, else 0 from the category's first month on. */
  months: Map<MonthKey, number>;
}

export interface ContinuousMergePlan<C, D> {
  categories: CategoryMergeGroup<C>[];
  cards: MergeGroup<D>[];
}

interface Matchable<T> extends MergeGroup<T> {
  defaultId: string | null;
  key: string;
}

const matchKey = (...parts: (string | null)[]) =>
  parts.map((part) => (part ?? "").trim().toLowerCase()).join("|");

/** Adds `row` to the group sharing its default id, else its key, else to a new group. */
const addToGroup = <T, G extends Matchable<T>>(
  groups: G[],
  row: T & { id: string },
  defaultId: string | null,
  key: string,
  createGroup: (base: Matchable<T>) => G,
): G => {
  let group =
    (defaultId ? groups.find((g) => g.defaultId === defaultId) : undefined) ??
    groups.find((g) => g.key === key);
  if (!group) {
    group = createGroup({
      targetId: null,
      template: row,
      sourceIds: [],
      defaultId,
      key,
    });
    groups.push(group);
  }
  group.sourceIds.push(row.id);
  return group;
};

const withoutMatchFields = <G extends Matchable<unknown>>(groups: G[]) =>
  groups.map(({ defaultId: _defaultId, key: _key, ...group }) => group);

/**
 * Matches every category and card of the monthly budgets being merged to the continuous
 * budget's row (by default id, then name plus group or last four), groups the unmatched
 * ones into rows to create, and computes each category's planned amount per month.
 */
export const planContinuousMerge = <
  C extends MergeCategory,
  D extends MergeCard,
>(
  target: { categories: C[]; cards: D[] },
  sources: MergeSourceBudget<C, D>[],
): ContinuousMergePlan<C, D> => {
  type CategoryGroup = Matchable<C> & CategoryMergeGroup<C>;
  const categoryKey = (row: C) => matchKey(row.name, row.group);
  const cardKey = (row: D) => matchKey(row.name, row.lastFourDigits);

  const categories: CategoryGroup[] = target.categories.map((row) => ({
    targetId: row.id,
    template: row,
    sourceIds: [],
    defaultId: row.defaultCategoryId,
    key: categoryKey(row),
    firstCreatedAt: row.createdAt,
    months: new Map(),
  }));
  const cards: Matchable<D>[] = target.cards.map((row) => ({
    targetId: row.id,
    template: row,
    sourceIds: [],
    defaultId: row.defaultCardId,
    key: cardKey(row),
  }));

  const latestFirst = [...sources].sort(
    (a, b) => b.startAt.getTime() - a.startAt.getTime(),
  );
  // Budgets sharing a start month replaced one another: plan from the latest one not archived.
  const planBudgets = new Map<MonthKey, MergeSourceBudget<C, D>>();
  for (const source of latestFirst) {
    const month = toMonthKey(source.startAt);
    const current = planBudgets.get(month);
    if (
      !current ||
      (current.status === BudgetStatus.ARCHIVED &&
        source.status !== BudgetStatus.ARCHIVED)
    ) {
      planBudgets.set(month, source);
    }
  }

  const firstSourceMonth = new Map<CategoryGroup, MonthKey>();
  for (const source of latestFirst) {
    const month = toMonthKey(source.startAt);
    const plansMonth = planBudgets.get(month) === source;
    for (const row of source.categories) {
      const group = addToGroup(
        categories,
        row,
        row.defaultCategoryId,
        categoryKey(row),
        (base): CategoryGroup => ({
          ...base,
          firstCreatedAt: row.createdAt,
          months: new Map(),
        }),
      );
      if (row.createdAt < group.firstCreatedAt) {
        group.firstCreatedAt = row.createdAt;
      }
      const seen = firstSourceMonth.get(group);
      if (!seen || month < seen) firstSourceMonth.set(group, month);
      if (!plansMonth) continue;
      group.months.set(
        month,
        roundToCents(
          (group.months.get(month) ?? 0) + (row.allocatedAmount ?? 0),
        ),
      );
    }
    for (const row of source.cards) {
      addToGroup(cards, row, row.defaultCardId, cardKey(row), (base) => base);
    }
  }

  // A merged month plans 0 for categories its budget didn't have, not the default; months before a category existed (created or in a merged budget) get no row so it stays hidden there.
  const mergedMonths = [...planBudgets.keys()];
  for (const group of categories) {
    const createdMonth = toMonthKey(group.firstCreatedAt);
    const sourceMonth = firstSourceMonth.get(group);
    const firstMonth =
      sourceMonth && sourceMonth < createdMonth ? sourceMonth : createdMonth;
    for (const month of mergedMonths) {
      if (month >= firstMonth && !group.months.has(month)) {
        group.months.set(month, 0);
      }
    }
  }

  return {
    categories: withoutMatchFields(
      categories.filter(
        (group) => group.sourceIds.length > 0 || group.months.size > 0,
      ),
    ),
    cards: withoutMatchFields(
      cards.filter((group) => group.sourceIds.length > 0),
    ),
  };
};
