import { CardType, TransactionType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  calculateBudgetSpent,
  calculateCategorySpentInWindow,
  calculateSpendingPercentage,
  calculateTotalIncome,
  getTransactionSpending,
  isWithinWindow,
} from "@/lib/utils/spending";

const tx = (
  transactionType: TransactionType,
  amount: number,
  overrides: Partial<Parameters<typeof getTransactionSpending>[0]> = {},
) => ({ transactionType, amount, ...overrides });

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
