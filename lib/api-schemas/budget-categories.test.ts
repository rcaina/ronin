import { CategoryType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  createBudgetCategorySchema,
  updateBudgetCategorySchema,
} from "@/lib/api-schemas/budget-categories";

const baseCreate = {
  categoryName: "Groceries",
  group: CategoryType.NEEDS,
};

describe("createBudgetCategorySchema allocatedAmount", () => {
  it("accepts a zero allocation", () => {
    const result = createBudgetCategorySchema.safeParse({
      ...baseCreate,
      allocatedAmount: 0,
    });

    expect(result.success).toBe(true);
  });

  it("accepts a positive allocation", () => {
    const result = createBudgetCategorySchema.safeParse({
      ...baseCreate,
      allocatedAmount: 250.5,
    });

    expect(result.success).toBe(true);
  });

  it("rejects a negative allocation", () => {
    const result = createBudgetCategorySchema.safeParse({
      ...baseCreate,
      allocatedAmount: -1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.path.includes("allocatedAmount"),
        ),
      ).toBe(true);
    }
  });
});

describe("updateBudgetCategorySchema allocatedAmount", () => {
  it("accepts resetting an allocation to zero", () => {
    const result = updateBudgetCategorySchema.safeParse({
      allocatedAmount: 0,
    });

    expect(result.success).toBe(true);
  });

  it("rejects a negative allocation", () => {
    const result = updateBudgetCategorySchema.safeParse({
      allocatedAmount: -0.01,
    });

    expect(result.success).toBe(false);
  });

  it("still allows updating without an allocation", () => {
    const result = updateBudgetCategorySchema.safeParse({
      name: "Renamed",
    });

    expect(result.success).toBe(true);
  });
});
