import { z } from "zod";

// ---- Request: scan a receipt image ----
export const scanReceiptSchema = z.object({
  budgetId: z.string().min(1, "Budget is required"),
  /** Base64-encoded image data (no data: prefix). */
  imageBase64: z.string().min(1, "Image is required"),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
});
export type ScanReceiptSchema = z.infer<typeof scanReceiptSchema>;

// ---- Structured output the model must return ----
// Kept free of numeric/length constraints so it maps cleanly to the
// structured-outputs JSON schema. The model extracts and classifies only;
// all tax/total arithmetic is done server- and client-side from these values.
export const receiptExtractionSchema = z.object({
  merchant: z.string().nullable(),
  /** Purchase date as YYYY-MM-DD, or null if not legible. */
  purchasedAt: z.string().nullable(),
  /** ISO currency code, e.g. "USD". */
  currency: z.string(),
  lineItems: z.array(
    z.object({
      description: z.string(),
      /** Pre-tax line amount (qty × unit price, after item-level discounts). */
      amount: z.number(),
      /** Chosen from the provided category ids, or null when none fits. */
      categoryId: z.string().nullable(),
    }),
  ),
  /** Pre-tax subtotal as printed, or null if absent. */
  subtotal: z.number().nullable(),
  /** Total sales tax. */
  tax: z.number(),
  /** Gratuity, else 0. */
  tip: z.number(),
  /** Misc receipt-level fees not tied to a single item, else 0. */
  otherFees: z.number(),
  /** Grand total as printed, or null if absent. */
  total: z.number().nullable(),
  /** Model's overall confidence in the extraction, 0–1. */
  confidence: z.number(),
});
export type ReceiptExtraction = z.infer<typeof receiptExtractionSchema>;
