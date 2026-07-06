import { TransactionType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  createTransactionSchema,
  updateTransactionSchema,
} from "@/lib/api-schemas/transactions";

const baseCreate = {
  amount: 30,
  budgetId: "budget-1",
};

describe("createTransactionSchema splits", () => {
  it("parses a valid split create request", () => {
    const result = createTransactionSchema.safeParse({
      ...baseCreate,
      splits: [
        { categoryId: "cat-1", amount: 10 },
        { categoryId: "cat-2", amount: 20 },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects splits combined with a categoryId", () => {
    const result = createTransactionSchema.safeParse({
      ...baseCreate,
      categoryId: "cat-1",
      splits: [
        { categoryId: "cat-1", amount: 10 },
        { categoryId: "cat-2", amount: 20 },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.includes("categoryId")),
      ).toBe(true);
    }
  });

  it("rejects a single split (minimum of two required)", () => {
    const result = createTransactionSchema.safeParse({
      ...baseCreate,
      splits: [{ categoryId: "cat-1", amount: 30 }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects splits whose sum does not match the transaction amount", () => {
    const result = createTransactionSchema.safeParse({
      ...baseCreate,
      amount: 30,
      splits: [
        { categoryId: "cat-1", amount: 10 },
        { categoryId: "cat-2", amount: 15 },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.includes("splits")),
      ).toBe(true);
    }
  });

  it("accepts a sum off by a fraction of a cent, within tolerance", () => {
    const result = createTransactionSchema.safeParse({
      ...baseCreate,
      amount: 20.01,
      splits: [
        { categoryId: "cat-1", amount: 10.005 },
        { categoryId: "cat-2", amount: 10.005 },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects splits on an INCOME transaction", () => {
    const result = createTransactionSchema.safeParse({
      ...baseCreate,
      transactionType: TransactionType.INCOME,
      splits: [
        { categoryId: "cat-1", amount: 10 },
        { categoryId: "cat-2", amount: 20 },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.path.includes("transactionType"),
        ),
      ).toBe(true);
    }
  });
});

describe("updateTransactionSchema splits", () => {
  it("rejects splits combined with a non-empty categoryId", () => {
    const result = updateTransactionSchema.safeParse({
      categoryId: "cat-1",
      splits: [
        { categoryId: "cat-1", amount: 10 },
        { categoryId: "cat-2", amount: 20 },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.includes("categoryId")),
      ).toBe(true);
    }
  });

  it("accepts splits with a matching amount", () => {
    const result = updateTransactionSchema.safeParse({
      amount: 30,
      splits: [
        { categoryId: "cat-1", amount: 10 },
        { categoryId: "cat-2", amount: 20 },
      ],
    });

    expect(result.success).toBe(true);
  });
});
