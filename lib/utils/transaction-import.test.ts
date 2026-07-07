import { describe, expect, it } from "vitest";
import { TransactionType } from "@prisma/client";
import {
  duplicateKey,
  evaluateImportRow,
  normalizeName,
  parseImportedAmount,
  parseImportedDate,
  parseImportedType,
  type ImportRowContext,
  type RawImportRow,
} from "@/lib/utils/transaction-import";

describe("parseImportedAmount", () => {
  it("parses a plain number", () => {
    expect(parseImportedAmount("12.34")).toBe(12.34);
  });

  it("strips currency symbols and thousands separators", () => {
    expect(parseImportedAmount("$1,234.56")).toBe(1234.56);
  });

  it("treats parentheses as negative", () => {
    expect(parseImportedAmount("(12.00)")).toBe(-12);
  });

  it("honours a leading minus", () => {
    expect(parseImportedAmount("-8.5")).toBe(-8.5);
  });

  it("honours a trailing minus", () => {
    expect(parseImportedAmount("8.5-")).toBe(-8.5);
  });

  it("returns null for empty or non-numeric input", () => {
    expect(parseImportedAmount("")).toBeNull();
    expect(parseImportedAmount("   ")).toBeNull();
    expect(parseImportedAmount("abc")).toBeNull();
    expect(parseImportedAmount("$")).toBeNull();
  });

  it("rounds to cents", () => {
    expect(parseImportedAmount("1.239")).toBe(1.24);
  });
});

describe("parseImportedDate", () => {
  it("passes through ISO dates", () => {
    expect(parseImportedDate("2024-03-05")).toBe("2024-03-05");
  });

  it("extracts the date part of an ISO datetime", () => {
    expect(parseImportedDate("2024-03-05T18:30:00.000Z")).toBe("2024-03-05");
  });

  it("parses M/D/YYYY US dates", () => {
    expect(parseImportedDate("3/5/2024")).toBe("2024-03-05");
    expect(parseImportedDate("03/05/2024")).toBe("2024-03-05");
  });

  it("parses M-D-YYYY and 2-digit years", () => {
    expect(parseImportedDate("3-5-24")).toBe("2024-03-05");
  });

  it("rejects impossible dates", () => {
    expect(parseImportedDate("2/31/2024")).toBeNull();
    expect(parseImportedDate("13/1/2024")).toBeNull();
  });

  it("returns null for empty/unparseable input", () => {
    expect(parseImportedDate("")).toBeNull();
    expect(parseImportedDate("not a date")).toBeNull();
  });
});

describe("parseImportedType", () => {
  it("maps enum names and synonyms", () => {
    expect(parseImportedType("RETURN")).toBe(TransactionType.RETURN);
    expect(parseImportedType("refund")).toBe(TransactionType.RETURN);
    expect(parseImportedType("Income")).toBe(TransactionType.INCOME);
    expect(parseImportedType("deposit")).toBe(TransactionType.INCOME);
    expect(parseImportedType("card payment")).toBe(
      TransactionType.CARD_PAYMENT,
    );
  });

  it("defaults to REGULAR for empty/unknown", () => {
    expect(parseImportedType("")).toBe(TransactionType.REGULAR);
    expect(parseImportedType("whatever")).toBe(TransactionType.REGULAR);
    expect(parseImportedType("expense")).toBe(TransactionType.REGULAR);
  });
});

describe("duplicateKey", () => {
  it("is stable across name casing/whitespace", () => {
    expect(duplicateKey("2024-01-01", 10, "  Coffee ")).toBe(
      duplicateKey("2024-01-01", 10, "coffee"),
    );
  });

  it("differs when amount differs", () => {
    expect(duplicateKey("2024-01-01", 10, "Coffee")).not.toBe(
      duplicateKey("2024-01-01", 11, "Coffee"),
    );
  });
});

describe("normalizeName", () => {
  it("trims and lowercases", () => {
    expect(normalizeName("  Rent ")).toBe("rent");
  });
});

const ctx = (overrides: Partial<ImportRowContext> = {}): ImportRowContext => ({
  categoriesByName: new Map([
    ["groceries", { id: "cat-1", name: "Groceries" }],
    ["rent", { id: "cat-2", name: "Rent" }],
  ]),
  cardsByName: new Map([["amex", { id: "card-1", name: "Amex" }]]),
  existingKeys: new Set<string>(),
  ...overrides,
});

const row = (overrides: Partial<RawImportRow> = {}): RawImportRow => ({
  date: "2024-01-15",
  name: "Coffee",
  amount: "4.50",
  category: "",
  card: "",
  type: "",
  ...overrides,
});

describe("evaluateImportRow", () => {
  it("validates a good row", () => {
    const result = evaluateImportRow(row(), 0, ctx());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.amount).toBe(4.5);
    expect(result.occurredAt).toBe("2024-01-15");
    expect(result.transactionType).toBe(TransactionType.REGULAR);
  });

  it("matches a category case-insensitively", () => {
    const result = evaluateImportRow(row({ category: "GROCERIES" }), 0, ctx());
    expect(result.matchedCategoryId).toBe("cat-1");
    expect(result.matchedCategoryName).toBe("Groceries");
  });

  it("leaves an unmatched category null without erroring", () => {
    const result = evaluateImportRow(row({ category: "Dining out" }), 0, ctx());
    expect(result.matchedCategoryId).toBeNull();
    expect(result.valid).toBe(true);
  });

  it("matches a card by name", () => {
    const result = evaluateImportRow(row({ card: "amex" }), 0, ctx());
    expect(result.matchedCardId).toBe("card-1");
  });

  it("flags a missing amount as invalid", () => {
    const result = evaluateImportRow(row({ amount: "" }), 0, ctx());
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Amount is required");
  });

  it("flags an invalid date as invalid", () => {
    const result = evaluateImportRow(row({ date: "nope" }), 0, ctx());
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Date"))).toBe(true);
  });

  it("flags a duplicate against existing keys", () => {
    const result = evaluateImportRow(
      row(),
      0,
      ctx({
        existingKeys: new Set([duplicateKey("2024-01-15", 4.5, "Coffee")]),
      }),
    );
    expect(result.duplicate).toBe(true);
    // A duplicate is still valid (importable) — the user chooses to include it.
    expect(result.valid).toBe(true);
  });
});
