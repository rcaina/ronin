import { HttpError } from "@/lib/errors";
import {
  receiptExtractionSchema,
  type ReceiptExtraction,
} from "@/lib/api-schemas/receipt";
import type { ReceiptCategoryInput } from "./types";

/**
 * The single prompt every provider uses, so extraction behaves identically
 * regardless of backend. The model classifies and transcribes only — it is
 * explicitly told NOT to compute tax allocation or totals; that math is done
 * deterministically server-side.
 */
export function buildReceiptPrompt(categories: ReceiptCategoryInput[]): string {
  const categoryList = categories.length
    ? categories.map((c) => `- ${c.id}: ${c.name} (${c.group})`).join("\n")
    : "(no categories available — leave every categoryId null)";

  return `You read a photo of a purchase receipt and return structured data for a household budgeting app.

Assign each line item to the single best-fitting category from this list, using the category's id. If nothing fits, use null.

Available categories:
${categoryList}

Return ONLY a JSON object (no markdown, no commentary) with exactly these fields:
{
  "merchant": string | null,          // store/vendor name, or null
  "purchasedAt": string | null,       // purchase date as "YYYY-MM-DD", or null
  "currency": string,                 // ISO code, e.g. "USD"
  "lineItems": [
    {
      "description": string,          // the item as printed
      "amount": number,               // PRE-TAX line amount (qty x unit price, after item discounts)
      "categoryId": string | null     // a category id from the list above, or null
    }
  ],
  "subtotal": number | null,          // pre-tax subtotal as printed, or null
  "tax": number,                      // total sales tax (0 if none)
  "tip": number,                      // gratuity (0 if none)
  "otherFees": number,                // receipt-level fees not tied to an item, e.g. bag/service fee (0 if none)
  "total": number | null,             // grand total as printed, or null
  "confidence": number                // your overall confidence 0..1
}

Rules:
- Do NOT include tax, tip, or fees inside any line item amount — report them only in the tax/tip/otherFees fields.
- Do NOT split or allocate tax across items. Report the single total tax figure as printed.
- All amounts are plain numbers (no currency symbols, no thousands separators).
- Transcribe what is printed; do not invent items. If the image is unreadable, return empty lineItems with confidence 0.`;
}

/**
 * Parses a model's JSON response (tolerating accidental code fences / prose)
 * and validates it against the receipt schema. Shared by every provider.
 */
export function parseReceiptResponse(text: string): ReceiptExtraction {
  const cleaned = extractJsonObject(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new HttpError("Could not read the receipt. Please try another photo.", 502);
  }

  const result = receiptExtractionSchema.safeParse(parsed);
  if (!result.success) {
    throw new HttpError("Could not read the receipt. Please try another photo.", 502);
  }
  return result.data;
}

/** Strips ```json fences and grabs the outermost {...} if the model added prose. */
function extractJsonObject(text: string): string {
  const withoutFences = text
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return withoutFences.slice(start, end + 1);
  }
  return withoutFences;
}
