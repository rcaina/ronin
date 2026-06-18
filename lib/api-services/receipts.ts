import { roundToCents } from "@/lib/utils";
import { getReceiptExtractor } from "@/lib/ai";
import type { ScanReceiptSchema } from "@/lib/api-schemas/receipt";
import type { ReceiptExtraction } from "@/lib/api-schemas/receipt";
import type {
  ScanReceiptResult,
  ReceiptCategoryOption,
} from "@/lib/types/receipt";
import type { PrismaClientTx } from "../prisma";

/**
 * Reads a receipt image with the configured AI provider, validates the result
 * against the budget's categories, and returns the extraction plus the category
 * list for the review screen. Does not persist anything (the image is not
 * stored) — saving happens after the user reviews/approves.
 */
export const scanReceipt = async (
  tx: PrismaClientTx,
  budgetId: string,
  input: Pick<ScanReceiptSchema, "imageBase64" | "mediaType">,
): Promise<ScanReceiptResult> => {
  const categoryRows = await tx.category.findMany({
    where: { budgetId, deleted: null },
    select: { id: true, name: true, group: true },
    orderBy: { name: "asc" },
  });

  const categories: ReceiptCategoryOption[] = categoryRows.map((c) => ({
    id: c.id,
    name: c.name,
    group: c.group,
  }));

  const extractor = getReceiptExtractor();
  const raw = await extractor.extractReceipt({
    imageBase64: input.imageBase64,
    mediaType: input.mediaType,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      group: c.group,
    })),
  });

  // Never trust model-supplied ids: drop any categoryId not in this budget.
  const validIds = new Set(categories.map((c) => c.id));
  const extraction: ReceiptExtraction = {
    ...raw,
    lineItems: raw.lineItems.map((item) => ({
      ...item,
      categoryId:
        item.categoryId && validIds.has(item.categoryId)
          ? item.categoryId
          : null,
    })),
  };

  return {
    extraction,
    categories,
    warnings: buildWarnings(extraction),
  };
};

function buildWarnings(extraction: ReceiptExtraction): string[] {
  const warnings: string[] = [];

  if (extraction.lineItems.length === 0) {
    warnings.push(
      "No line items could be read from this receipt — enter them manually or try a clearer photo.",
    );
  }

  if (extraction.confidence < 0.5) {
    warnings.push(
      "The receipt was hard to read — double-check the amounts and categories before saving.",
    );
  }

  const uncategorized = extraction.lineItems.filter(
    (i) => i.categoryId === null,
  ).length;
  if (uncategorized > 0) {
    warnings.push(
      `${uncategorized} item${uncategorized === 1 ? "" : "s"} need a category before saving.`,
    );
  }

  // Compare the printed grand total to what the parts add up to.
  if (extraction.total !== null) {
    const computed = roundToCents(
      extraction.lineItems.reduce((sum, i) => sum + i.amount, 0) +
        extraction.tax +
        extraction.tip +
        extraction.otherFees,
    );
    if (Math.abs(computed - extraction.total) > 0.02) {
      warnings.push(
        `Line items + tax (${computed.toFixed(2)}) don't match the printed total (${extraction.total.toFixed(2)}). Review the amounts.`,
      );
    }
  }

  return warnings;
}
