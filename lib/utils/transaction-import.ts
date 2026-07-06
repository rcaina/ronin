import { TransactionType } from "@prisma/client";
import { roundToCents } from "@/lib/utils";
import { toIsoDateString } from "@/lib/utils/csv";

/**
 * Pure, dependency-light helpers for the CSV transaction import flow
 * (`src/app/api/transactions/import/route.ts` +
 * `components/transactions/ImportTransactionsModal.tsx`). Everything here is
 * side-effect-free so the parsing/matching/validation rules can be unit
 * tested without a database (see `transaction-import.test.ts`); the route
 * feeds it lookup maps built from the account's own data.
 */

/** The transaction fields a user can map a CSV column onto. */
export type ImportColumnKey =
  | "date"
  | "name"
  | "amount"
  | "category"
  | "card"
  | "type";

/** Columns the user MUST map before a preview/import can run. */
export const REQUIRED_IMPORT_COLUMNS: ImportColumnKey[] = ["date", "amount"];

/** A single mapped CSV row, all values as raw strings (pre-validation). */
export interface RawImportRow {
  date: string;
  name: string;
  amount: string;
  category: string;
  card: string;
  type: string;
}

/** The validated/annotated view of a row shown in the preview step. */
export interface ImportPreviewRow {
  index: number;
  name: string;
  rawAmount: string;
  amount: number | null;
  rawDate: string;
  occurredAt: string | null;
  categoryName: string;
  matchedCategoryId: string | null;
  matchedCategoryName: string | null;
  cardName: string;
  matchedCardId: string | null;
  transactionType: TransactionType;
  errors: string[];
  duplicate: boolean;
  /** True when the row has no blocking errors and can be imported. */
  valid: boolean;
}

/** Minimal lookup entry for category/card name matching. */
export interface NamedRef {
  id: string;
  name: string;
}

export interface ImportRowContext {
  /** Category name (lowercased, trimmed) → category. */
  categoriesByName: Map<string, NamedRef>;
  /** Card name (lowercased, trimmed) → card. */
  cardsByName: Map<string, NamedRef>;
  /** Duplicate keys (see `duplicateKey`) already present in the account. */
  existingKeys: Set<string>;
}

/**
 * Parses a human/bank-formatted amount into a number:
 * - strips currency symbols, thousands separators, and whitespace
 * - treats parentheses as a negative (accounting style): `(12.00)` → `-12`
 * - honours a leading/trailing minus sign
 * Returns `null` when the value is empty or not a number.
 */
export function parseImportedAmount(raw: string): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (s === "") return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1);
  }

  // Drop everything except digits, sign, and decimal point.
  s = s.replace(/[^0-9.\-]/g, "");
  if (s === "" || s === "-" || s === ".") return null;

  const value = Number(s);
  if (Number.isNaN(value)) return null;

  const signed = negative ? -Math.abs(value) : value;
  return roundToCents(signed);
}

/**
 * Parses a date cell into an ISO `YYYY-MM-DD` string. Accepts ISO dates,
 * ISO datetimes, and common `M/D/YYYY` (or `M-D-YYYY`) US-style dates.
 * Returns `null` when empty or unparseable.
 */
export function parseImportedDate(raw: string): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;

  // Already ISO (date or datetime).
  if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(s)) {
    return toIsoDateString(s) || null;
  }

  // M/D/YYYY or M-D-YYYY (also accepts zero-padded and 2-digit years).
  const slashMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(s);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(date.getTime())) return null;
    // Guard against overflow (e.g. 2/31 → Mar 3).
    if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      return null;
    }
    return toIsoDateString(date) || null;
  }

  // Last resort: let Date try (handles e.g. "Jan 5, 2024").
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return null;
  return toIsoDateString(parsed) || null;
}

/**
 * Maps a free-text transaction-type cell onto a `TransactionType`. Recognises
 * the enum names and a few common synonyms; defaults to `REGULAR` when empty
 * or unrecognised.
 */
export function parseImportedType(raw: string): TransactionType {
  const s = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  switch (s) {
    case "RETURN":
    case "REFUND":
      return TransactionType.RETURN;
    case "INCOME":
    case "DEPOSIT":
      return TransactionType.INCOME;
    case "CARD_PAYMENT":
    case "PAYMENT":
      return TransactionType.CARD_PAYMENT;
    case "REGULAR":
    case "EXPENSE":
    case "PURCHASE":
    default:
      return TransactionType.REGULAR;
  }
}

/** Normalizes a name for case-insensitive matching/deduping. */
export function normalizeName(name: string): string {
  return String(name ?? "")
    .trim()
    .toLowerCase();
}

/**
 * Builds the duplicate-detection key for a row: date + amount + name. Two
 * rows (or a row and an existing transaction) collide when all three match,
 * so a re-import of the same file flags every previously-imported row.
 */
export function duplicateKey(
  isoDate: string,
  amount: number,
  name: string,
): string {
  return `${isoDate}|${amount.toFixed(2)}|${normalizeName(name)}`;
}

/**
 * Validates and annotates a single mapped row against the account's data.
 * Never throws — blocking problems land in `errors` and set `valid = false`;
 * an unmatched category is not an error (the row imports uncategorized).
 */
export function evaluateImportRow(
  raw: RawImportRow,
  index: number,
  ctx: ImportRowContext,
): ImportPreviewRow {
  const errors: string[] = [];

  const name = (raw.name ?? "").trim();
  const rawAmount = (raw.amount ?? "").trim();
  const rawDate = (raw.date ?? "").trim();
  const categoryName = (raw.category ?? "").trim();
  const cardName = (raw.card ?? "").trim();

  const amount = parseImportedAmount(rawAmount);
  if (amount === null) {
    errors.push(
      rawAmount === "" ? "Amount is required" : "Amount is not a number",
    );
  }

  const occurredAt = parseImportedDate(rawDate);
  if (occurredAt === null) {
    errors.push(
      rawDate === "" ? "Date is required" : "Date is not a valid date",
    );
  }

  const transactionType = parseImportedType(raw.type ?? "");

  const matchedCategory = categoryName
    ? (ctx.categoriesByName.get(normalizeName(categoryName)) ?? null)
    : null;

  const matchedCard = cardName
    ? (ctx.cardsByName.get(normalizeName(cardName)) ?? null)
    : null;

  const duplicate =
    amount !== null && occurredAt !== null
      ? ctx.existingKeys.has(duplicateKey(occurredAt, amount, name))
      : false;

  return {
    index,
    name,
    rawAmount,
    amount,
    rawDate,
    occurredAt,
    categoryName,
    matchedCategoryId: matchedCategory?.id ?? null,
    matchedCategoryName: matchedCategory?.name ?? null,
    cardName,
    matchedCardId: matchedCard?.id ?? null,
    transactionType,
    errors,
    duplicate,
    valid: errors.length === 0,
  };
}
