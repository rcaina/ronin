import { CardType, TransactionType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  calculateBudgetSpent,
  calculateCategorySpentInWindow,
  calculateSpendingPercentage,
  calculateTotalIncome,
  flattenBudgetTransactions,
  getSplitSpending,
  getTransactionSpending,
  isWithinWindow,
  type SpendingSplit,
  type SpendingTransaction,
} from "@/lib/utils/spending";

const tx = (
  transactionType: TransactionType,
  amount: number,
  overrides: Partial<Parameters<typeof getTransactionSpending>[0]> = {},
) => ({ transactionType, amount, ...overrides });

const split = (
  amount: number,
  transaction: SpendingTransaction,
): SpendingSplit => ({ amount, transaction });

describe("getTransactionSpending", () => {
  it("counts REGULAR transactions as spending", () => {
    expect(getTransactionSpending(tx(TransactionType.REGULAR, 25))).toBe(25);
  });

  it("counts RETURN as negative spending", () => {
    expect(getTransactionSpending(tx(TransactionType.RETURN, 10))).toBe(-10);
  });

  it("excludes INCOME and CARD_PAYMENT from spending", () => {
    expect(getTransactionSpending(tx(TransactionType.INCOME, 500))).toBe(0);
    expect(getTransactionSpending(tx(TransactionType.CARD_PAYMENT, 200))).toBe(
      0,
    );
  });
});

describe("isWithinWindow", () => {
  const window = {
    start: new Date("2026-06-01"),
    end: new Date("2026-06-30"),
  };

  it("includes everything when the window is null", () => {
    expect(
      isWithinWindow(
        tx(TransactionType.REGULAR, 5, { createdAt: "2020-01-01" }),
        null,
      ),
    ).toBe(true);
  });

  it("prefers occurredAt over createdAt", () => {
    const transaction = tx(TransactionType.REGULAR, 5, {
      createdAt: "2026-07-15",
      occurredAt: "2026-06-15",
    });
    expect(isWithinWindow(transaction, window)).toBe(true);
  });

  it("excludes transactions outside the window", () => {
    expect(
      isWithinWindow(
        tx(TransactionType.REGULAR, 5, { createdAt: "2026-07-15" }),
        window,
      ),
    ).toBe(false);
  });
});

describe("calculateCategorySpentInWindow", () => {
  it("nets purchases against returns and ignores money movement", () => {
    const category = {
      transactions: [
        tx(TransactionType.REGULAR, 100),
        tx(TransactionType.RETURN, 30),
        tx(TransactionType.INCOME, 1000),
        tx(TransactionType.CARD_PAYMENT, 50),
      ],
    };
    expect(calculateCategorySpentInWindow(category, null)).toBe(70);
  });

  it("handles missing transactions", () => {
    expect(calculateCategorySpentInWindow({}, null)).toBe(0);
  });
});

describe("calculateBudgetSpent", () => {
  it("sums spending across categories", () => {
    const budget = {
      categories: [
        { transactions: [tx(TransactionType.REGULAR, 40)] },
        { transactions: [tx(TransactionType.REGULAR, 60)] },
      ],
    };
    expect(calculateBudgetSpent(budget)).toBe(100);
  });
});

describe("calculateTotalIncome", () => {
  it("only counts INCOME on debit-type cards", () => {
    const budget = {
      cards: [
        { id: "debit", cardType: CardType.DEBIT },
        { id: "biz-debit", cardType: CardType.BUSINESS_DEBIT },
        { id: "credit", cardType: CardType.CREDIT },
      ],
      transactions: [
        tx(TransactionType.INCOME, 1000, { cardId: "debit" }),
        tx(TransactionType.INCOME, 500, { cardId: "biz-debit" }),
        tx(TransactionType.INCOME, 250, { cardId: "credit" }),
        tx(TransactionType.REGULAR, 75, { cardId: "debit" }),
      ],
    };
    expect(calculateTotalIncome(budget)).toBe(1500);
  });
});

describe("calculateSpendingPercentage", () => {
  it("computes spent as a percentage of income", () => {
    expect(calculateSpendingPercentage(50, 200)).toBe(25);
  });

  it("guards against divide-by-zero", () => {
    expect(calculateSpendingPercentage(50, 0)).toBe(0);
  });
});

describe("getSplitSpending", () => {
  it("counts a REGULAR parent's split as positive spending", () => {
    expect(getSplitSpending(split(25, tx(TransactionType.REGULAR, 100)))).toBe(
      25,
    );
  });

  it("counts a RETURN parent's split as negative spending", () => {
    expect(getSplitSpending(split(25, tx(TransactionType.RETURN, 100)))).toBe(
      -25,
    );
  });

  it("treats INCOME/CARD_PAYMENT parents as zero (defensive, impossible by invariant)", () => {
    expect(getSplitSpending(split(25, tx(TransactionType.INCOME, 100)))).toBe(
      0,
    );
    expect(
      getSplitSpending(split(25, tx(TransactionType.CARD_PAYMENT, 100))),
    ).toBe(0);
  });
});

describe("calculateCategorySpentInWindow with splits", () => {
  it("sums plain transactions and split legs together", () => {
    const category = {
      transactions: [tx(TransactionType.REGULAR, 100)],
      transactionSplits: [
        split(30, tx(TransactionType.REGULAR, 90, { id: "parent-1" })),
      ],
    };
    expect(calculateCategorySpentInWindow(category, null)).toBe(130);
  });

  it("nets a RETURN parent's split against other spending", () => {
    const category = {
      transactions: [tx(TransactionType.REGULAR, 100)],
      transactionSplits: [
        split(30, tx(TransactionType.RETURN, 30, { id: "parent-1" })),
      ],
    };
    expect(calculateCategorySpentInWindow(category, null)).toBe(70);
  });

  it("windows splits by the parent transaction's date, not any date of its own", () => {
    const window = {
      start: new Date("2026-06-01"),
      end: new Date("2026-06-30"),
    };

    const inWindow = {
      transactions: [],
      transactionSplits: [
        split(
          50,
          tx(TransactionType.REGULAR, 200, {
            id: "in-window",
            occurredAt: "2026-06-15",
          }),
        ),
      ],
    };
    const outOfWindow = {
      transactions: [],
      transactionSplits: [
        split(
          50,
          tx(TransactionType.REGULAR, 200, {
            id: "out-of-window",
            occurredAt: "2026-07-15",
          }),
        ),
      ],
    };

    expect(calculateCategorySpentInWindow(inWindow, window)).toBe(50);
    expect(calculateCategorySpentInWindow(outOfWindow, window)).toBe(0);
  });

  it("falls back to createdAt when a split's parent has no occurredAt", () => {
    const window = {
      start: new Date("2026-06-01"),
      end: new Date("2026-06-30"),
    };
    const category = {
      transactions: [],
      transactionSplits: [
        split(
          50,
          tx(TransactionType.REGULAR, 200, {
            id: "created-only",
            createdAt: "2026-06-10",
          }),
        ),
      ],
    };
    expect(calculateCategorySpentInWindow(category, window)).toBe(50);
  });
});

describe("split/plain consistency", () => {
  it("budget total via categories equals the flat sum of parent amounts", () => {
    // One plain transaction plus one split parent shared across two
    // categories (60/40 of a $100 receipt).
    const plainTx = tx(TransactionType.REGULAR, 40, { id: "plain-1" });
    const parent = tx(TransactionType.REGULAR, 100, { id: "split-parent-1" });

    const budget = {
      categories: [
        {
          transactions: [plainTx],
          transactionSplits: [split(60, parent)],
        },
        {
          transactions: [],
          transactionSplits: [split(40, parent)],
        },
      ],
    };

    const budgetTotal = calculateBudgetSpent(budget);
    expect(budgetTotal).toBe(140);

    const flatSum = flattenBudgetTransactions([budget]).reduce(
      (sum, transaction) => sum + getTransactionSpending(transaction),
      0,
    );
    expect(flatSum).toBe(140);
    expect(budgetTotal).toBe(flatSum);
  });
});

describe("flattenBudgetTransactions", () => {
  it("counts a split parent exactly once when it spans three categories", () => {
    const parent = tx(TransactionType.REGULAR, 90, { id: "shared-parent" });
    const budget = {
      categories: [
        { transactions: [], transactionSplits: [split(30, parent)] },
        { transactions: [], transactionSplits: [split(30, parent)] },
        { transactions: [], transactionSplits: [split(30, parent)] },
      ],
    };

    const flattened = flattenBudgetTransactions([budget]);
    const parentOccurrences = flattened.filter(
      (transaction) => transaction.id === "shared-parent",
    );
    expect(parentOccurrences).toHaveLength(1);
    expect(flattened).toHaveLength(1);
  });

  it("keeps plain category transactions alongside deduped split parents", () => {
    const plain = tx(TransactionType.REGULAR, 10, { id: "plain-1" });
    const parent = tx(TransactionType.REGULAR, 90, { id: "shared-parent" });
    const budget = {
      categories: [
        { transactions: [plain], transactionSplits: [split(45, parent)] },
        { transactions: [], transactionSplits: [split(45, parent)] },
      ],
    };

    const flattened = flattenBudgetTransactions([budget]);
    expect(flattened).toHaveLength(2);
    expect(flattened.map((t) => t.id).sort()).toEqual([
      "plain-1",
      "shared-parent",
    ]);
  });

  it("passes through transactions without an id unconditionally (legacy callers)", () => {
    const budget = {
      categories: [
        { transactions: [tx(TransactionType.REGULAR, 10)] },
        { transactions: [tx(TransactionType.REGULAR, 20)] },
      ],
    };
    expect(flattenBudgetTransactions([budget])).toHaveLength(2);
  });
});
