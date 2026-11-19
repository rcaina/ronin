import { BudgetStatus, CategoryType, TransactionType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  type MergeCard,
  type MergeCategory,
  planContinuousMerge,
  planBackfillGapHides,
} from "@/lib/utils/continuous-merge";

const category = (
  id: string,
  overrides: Partial<MergeCategory> = {},
): MergeCategory => ({
  id,
  name: "Groceries",
  group: CategoryType.NEEDS,
  defaultCategoryId: null,
  allocatedAmount: 100,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

const card = (id: string, overrides: Partial<MergeCard> = {}): MergeCard => ({
  id,
  name: "Visa",
  lastFourDigits: "1234",
  defaultCardId: null,
  ...overrides,
});

const budget = (
  startAt: string,
  categories: MergeCategory[],
  cards: MergeCard[] = [],
  status: BudgetStatus = BudgetStatus.COMPLETED,
) => ({ startAt: new Date(startAt), status, categories, cards });

describe("planContinuousMerge categories", () => {
  it("matches by default id first, then by name and group ignoring case and spaces", () => {
    const plan = planContinuousMerge(
      {
        categories: [
          category("t-food", { name: "Food", defaultCategoryId: "d-1" }),
          category("t-rent", { name: "Rent" }),
        ],
        cards: [],
      },
      [
        budget("2026-02-01T00:00:00Z", [
          category("s-1", { name: "Groceries", defaultCategoryId: "d-1" }),
          category("s-2", { name: " rent " }),
          category("s-3", { name: "Rent", group: CategoryType.WANTS }),
        ]),
      ],
    );

    expect(
      plan.categories.map((group) => [group.targetId, group.sourceIds]),
    ).toEqual([
      ["t-food", ["s-1"]],
      ["t-rent", ["s-2"]],
      [null, ["s-3"]],
    ]);
  });

  it("collapses unmatched rows across budgets into one new category from the latest budget", () => {
    const plan = planContinuousMerge({ categories: [], cards: [] }, [
      budget("2026-02-01T00:00:00Z", [
        category("feb", {
          defaultCategoryId: "d-1",
          allocatedAmount: 80,
          createdAt: new Date("2026-02-01T00:00:00Z"),
        }),
      ]),
      budget("2026-03-01T00:00:00Z", [
        category("mar", {
          name: "Food",
          defaultCategoryId: "d-1",
          allocatedAmount: 120,
          createdAt: new Date("2026-03-01T00:00:00Z"),
        }),
      ]),
    ]);

    expect(plan.categories).toHaveLength(1);
    const [group] = plan.categories;
    expect(group!.targetId).toBeNull();
    expect(group!.template.id).toBe("mar");
    expect([...group!.sourceIds].sort()).toEqual(["feb", "mar"]);
    expect(group!.firstCreatedAt.toISOString()).toBe(
      "2026-02-01T00:00:00.000Z",
    );
  });

  it("plans each budget's amount in its start month, from the latest budget when two share a month", () => {
    const plan = planContinuousMerge({ categories: [], cards: [] }, [
      budget("2026-02-15T00:00:00Z", [
        category("a", { allocatedAmount: 50.1 }),
      ]),
      budget("2026-02-01T00:00:00Z", [
        category("b", { allocatedAmount: 25.2 }),
      ]),
      budget("2026-03-31T23:59:59Z", [
        category("c", { allocatedAmount: null }),
      ]),
    ]);

    expect(plan.categories[0]!.sourceIds).toEqual(["c", "a", "b"]);
    expect(Object.fromEntries(plan.categories[0]!.months)).toEqual({
      "2026-02": 50.1,
      "2026-03": 0,
    });
  });

  it("plans a shared month from the budget that was not archived, even if it started earlier", () => {
    const plan = planContinuousMerge({ categories: [], cards: [] }, [
      budget("2026-05-01T00:00:00Z", [
        category("kept", { allocatedAmount: 300 }),
      ]),
      budget(
        "2026-05-20T00:00:00Z",
        [
          category("archived", { allocatedAmount: 280 }),
          category("archived-only", { name: "Gifts", allocatedAmount: 50 }),
        ],
        [],
        BudgetStatus.ARCHIVED,
      ),
    ]);

    expect(
      plan.categories.map((group) => [
        group.sourceIds,
        Object.fromEntries(group.months),
      ]),
    ).toEqual([
      [["archived", "kept"], { "2026-05": 300 }],
      [["archived-only"], { "2026-05": 0 }],
    ]);
  });

  it("plans a shared month from the earlier budget when the later one is archived, and pins its other categories to 0 from that month", () => {
    const plan = planContinuousMerge({ categories: [], cards: [] }, [
      budget("2025-09-01T00:00:00Z", [
        category("sep-food", { allocatedAmount: 400 }),
      ]),
      budget(
        "2025-09-22T00:00:00Z",
        [
          category("archived-food", { allocatedAmount: 380 }),
          category("archived-gas", {
            name: "Gas",
            allocatedAmount: 200,
            createdAt: new Date("2025-10-05T00:00:00Z"),
          }),
        ],
        [],
        BudgetStatus.ARCHIVED,
      ),
      budget("2025-10-01T00:00:00Z", [
        category("oct-food", { allocatedAmount: 410 }),
      ]),
    ]);

    expect(
      plan.categories.map((group) => [
        group.sourceIds,
        Object.fromEntries(group.months),
      ]),
    ).toEqual([
      [
        ["oct-food", "archived-food", "sep-food"],
        { "2025-10": 410, "2025-09": 400 },
      ],
      [["archived-gas"], { "2025-09": 0, "2025-10": 0 }],
    ]);
  });

  it("plans a month shared by two archived budgets from the later one", () => {
    const plan = planContinuousMerge({ categories: [], cards: [] }, [
      budget(
        "2026-05-01T00:00:00Z",
        [category("early")],
        [],
        BudgetStatus.ARCHIVED,
      ),
      budget(
        "2026-05-20T00:00:00Z",
        [category("late", { allocatedAmount: 250 })],
        [],
        BudgetStatus.ARCHIVED,
      ),
    ]);

    expect(Object.fromEntries(plan.categories[0]!.months)).toEqual({
      "2026-05": 250,
    });
  });

  it("writes no row for merged months before a category existed", () => {
    const plan = planContinuousMerge({ categories: [], cards: [] }, [
      budget("2026-02-01T00:00:00Z", [category("feb-food")]),
      budget("2026-03-01T00:00:00Z", [
        category("mar-gym", {
          name: "Gym",
          allocatedAmount: 40,
          createdAt: new Date("2026-03-01T00:00:00Z"),
        }),
      ]),
    ]);

    expect(
      Object.fromEntries(
        plan.categories.find((group) => group.template.id === "mar-gym")!
          .months,
      ),
    ).toEqual({ "2026-03": 40 });
  });

  it("plans 0 in a merged month for every category that budget did not have", () => {
    const plan = planContinuousMerge(
      { categories: [category("t-pets", { name: "Pets" })], cards: [] },
      [
        budget("2026-02-01T00:00:00Z", [category("feb-food")]),
        budget("2026-03-01T00:00:00Z", [
          category("mar-food", { allocatedAmount: 90 }),
          category("mar-gym", { name: "Gym", allocatedAmount: 40 }),
        ]),
        budget("2026-04-01T00:00:00Z", []),
      ],
    );

    expect(
      plan.categories.map((group) => [
        group.targetId ?? group.template.id,
        Object.fromEntries(group.months),
      ]),
    ).toEqual([
      ["t-pets", { "2026-02": 0, "2026-03": 0, "2026-04": 0 }],
      ["mar-food", { "2026-02": 100, "2026-03": 90, "2026-04": 0 }],
      ["mar-gym", { "2026-02": 0, "2026-03": 40, "2026-04": 0 }],
    ]);
  });

  it("leaves the continuous budget's own rows out of the plan", () => {
    const plan = planContinuousMerge(
      { categories: [category("t-1")], cards: [card("t-card")] },
      [],
    );

    expect(plan).toEqual({ categories: [], cards: [] });
  });
});

describe("planContinuousMerge cards", () => {
  it("matches by default card id, then name and last four", () => {
    const plan = planContinuousMerge(
      {
        categories: [],
        cards: [
          card("t-main", { name: "Main", defaultCardId: "g-1" }),
          card("t-visa"),
        ],
      },
      [
        budget(
          "2026-02-01T00:00:00Z",
          [],
          [
            card("s-1", { name: "Checking", defaultCardId: "g-1" }),
            card("s-2", { name: "VISA" }),
            card("s-3", { lastFourDigits: "9999" }),
          ],
        ),
      ],
    );

    expect(
      plan.cards.map((group) => [group.targetId, group.sourceIds]),
    ).toEqual([
      ["t-main", ["s-1"]],
      ["t-visa", ["s-2"]],
      [null, ["s-3"]],
    ]);
  });
});

describe("planBackfillGapHides", () => {
  const row = (month: string, hidden = false, assigned = 100) => ({
    month: new Date(`${month}-01T00:00:00.000Z`),
    assigned,
    hidden,
  });
  const zero = (month: string) => row(month, false, 0);
  const spend = (date: string) => ({
    transactionType: TransactionType.REGULAR,
    amount: 10,
    occurredAt: date,
    createdAt: date,
  });
  const category = (
    overrides: Partial<Parameters<typeof planBackfillGapHides>[0]> = {},
  ): Parameters<typeof planBackfillGapHides>[0] => ({
    createdAt: new Date("2026-02-01T00:00:00.000Z"),
    hiddenFrom: null,
    months: [],
    transactions: [],
    ...overrides,
  });

  it("hides the months between monthly budgets it wasn't in", () => {
    const plan = planBackfillGapHides(
      category({ months: [row("2026-02"), row("2026-05")] }),
      "2026-05",
    );
    expect(plan).toEqual({
      hideMonths: ["2026-03", "2026-04"],
      hiddenFrom: null,
    });
  });

  it("keeps a month with transactions but no plan", () => {
    const plan = planBackfillGapHides(
      category({
        months: [row("2026-02"), row("2026-05")],
        transactions: [spend("2026-03-10T00:00:00.000Z")],
      }),
      "2026-05",
    );
    expect(plan.hideMonths).toEqual(["2026-04"]);
  });

  it("hides from the month after its last use when the last monthly budgets left it out", () => {
    const plan = planBackfillGapHides(
      category({ months: [row("2026-02"), row("2026-04")] }),
      "2026-07",
    );
    expect(plan).toEqual({ hideMonths: ["2026-03"], hiddenFrom: "2026-05" });
  });

  it("leaves months after the last monthly budget alone when it was in it", () => {
    expect(
      planBackfillGapHides(category({ months: [row("2026-02")] }), "2026-02"),
    ).toEqual({ hideMonths: [], hiddenFrom: null });
  });

  it("does nothing to a category already hidden anywhere", () => {
    expect(
      planBackfillGapHides(
        category({ months: [row("2026-02"), row("2026-03", true)] }),
        "2026-07",
      ),
    ).toEqual({ hideMonths: [], hiddenFrom: null });
    expect(
      planBackfillGapHides(
        category({
          months: [row("2026-02")],
          hiddenFrom: new Date("2026-06-01T00:00:00.000Z"),
        }),
        "2026-07",
      ),
    ).toEqual({ hideMonths: [], hiddenFrom: null });
  });

  it("treats the backfill's $0 months without transactions as unused", () => {
    expect(
      planBackfillGapHides(
        category({
          months: [
            row("2026-02"),
            zero("2026-03"),
            zero("2026-04"),
            row("2026-05"),
          ],
          transactions: [spend("2026-04-02T00:00:00.000Z")],
        }),
        "2026-05",
      ),
    ).toEqual({ hideMonths: ["2026-03"], hiddenFrom: null });
  });

  it("hides from after the last nonzero plan when later budgets planned it at $0", () => {
    expect(
      planBackfillGapHides(
        category({
          months: [row("2026-02"), zero("2026-03"), zero("2026-04")],
        }),
        "2026-04",
      ),
    ).toEqual({ hideMonths: [], hiddenFrom: "2026-03" });
  });

  it("hides a never-used category from its first month", () => {
    expect(
      planBackfillGapHides(
        category({ months: [zero("2026-02"), zero("2026-03")] }),
        "2026-03",
      ),
    ).toEqual({ hideMonths: [], hiddenFrom: "2026-02" });
  });
});
