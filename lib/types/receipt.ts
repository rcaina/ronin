import type { CategoryType } from "@prisma/client";
import type { ReceiptExtraction } from "@/lib/api-schemas/receipt";

export type { ReceiptExtraction };

/** A budget category surfaced to the review UI for (re)assigning line items. */
export interface ReceiptCategoryOption {
  id: string;
  name: string;
  group: CategoryType;
}

/** Response from POST /api/transactions/scan-receipt. */
export interface ScanReceiptResult {
  /** Model extraction, with category ids validated against the budget. */
  extraction: ReceiptExtraction;
  /** Budget categories available for assignment in the review screen. */
  categories: ReceiptCategoryOption[];
  /** Non-fatal notes for the user (total mismatch, low confidence, etc.). */
  warnings: string[];
}
