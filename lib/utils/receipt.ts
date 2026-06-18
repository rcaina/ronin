import { roundToCents, sumMonetaryValues } from "@/lib/utils";

/**
 * Receipt → transaction allocation.
 *
 * A single receipt can contain items that belong to different budget
 * categories. When that happens we create one transaction per category. The
 * open question is how the receipt-level charges that aren't tied to a single
 * item — sales tax, tip/gratuity, and misc fees — get split.
 *
 * Decision: tax, tip, and fees are allocated to each category **in proportion
 * to that category's pre-tax subtotal**. This mirrors how sales tax actually
 * accrues (tax is a function of the taxable item total) and keeps every
 * category's share fair regardless of how many line items it has. The model
 * only extracts and classifies; all arithmetic happens here so it is
 * deterministic and the per-category amounts always reconcile to the grand
 * total to the cent.
 */

export interface ReceiptLineItemInput {
  description: string;
  /** Pre-tax line amount (quantity × unit price, after any item-level discount). */
  amount: number;
  /** Budget category id, or null when not yet assigned. */
  categoryId: string | null;
}

export interface ReceiptCharges {
  /** Total sales tax printed on the receipt. */
  tax: number;
  /** Gratuity, if any. */
  tip: number;
  /** Misc receipt-level fees not tied to a single item (bag fee, service charge…). */
  otherFees: number;
}

export interface CategoryAllocation {
  categoryId: string | null;
  /** Pre-tax sum of this category's line items. */
  subtotal: number;
  /** This category's proportional share of tax. */
  allocatedTax: number;
  /** This category's proportional share of tip + fees. */
  allocatedExtra: number;
  /** subtotal + allocatedTax + allocatedExtra — becomes the transaction amount. */
  total: number;
  lineItems: ReceiptLineItemInput[];
}

export interface ReceiptAllocation {
  subtotal: number;
  tax: number;
  tip: number;
  otherFees: number;
  /** subtotal + tax + tip + fees, rounded — the sum of every category total. */
  grandTotal: number;
  categories: CategoryAllocation[];
  /** Combined total of any line items still without a category. */
  uncategorizedTotal: number;
}

/**
 * Splits `amount` across buckets weighted by `weights`, rounding each share to
 * cents and pushing any rounding drift onto the largest-weight bucket so the
 * shares sum back to `amount` exactly. Falls back to an equal split when the
 * weights carry no signal (all zero).
 */
function distributeProportionally(amount: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];

  const totalWeight = sumMonetaryValues(weights);
  const shares = weights.map((w) =>
    totalWeight > 0
      ? roundToCents((amount * w) / totalWeight)
      : roundToCents(amount / n),
  );

  const drift = roundToCents(amount - sumMonetaryValues(shares));
  if (drift !== 0) {
    let maxIdx = 0;
    for (let i = 1; i < n; i++) {
      if ((weights[i] ?? 0) > (weights[maxIdx] ?? 0)) maxIdx = i;
    }
    shares[maxIdx] = roundToCents((shares[maxIdx] ?? 0) + drift);
  }

  return shares;
}

/**
 * Groups line items by category and allocates receipt-level charges
 * proportionally to each category's pre-tax subtotal.
 */
export function allocateReceipt(
  lineItems: ReceiptLineItemInput[],
  charges: ReceiptCharges,
): ReceiptAllocation {
  const tax = roundToCents(charges.tax);
  const tip = roundToCents(charges.tip);
  const otherFees = roundToCents(charges.otherFees);
  const extra = roundToCents(tip + otherFees);

  // Group items by category, preserving first-seen order. Uncategorized items
  // (categoryId === null) collapse into their own group.
  const groups: Array<{
    categoryId: string | null;
    items: ReceiptLineItemInput[];
  }> = [];
  const indexByKey = new Map<string, number>();
  for (const item of lineItems) {
    const key = item.categoryId ?? "__uncategorized__";
    let idx = indexByKey.get(key);
    if (idx === undefined) {
      idx = groups.length;
      indexByKey.set(key, idx);
      groups.push({ categoryId: item.categoryId, items: [] });
    }
    groups[idx]!.items.push(item);
  }

  const subtotals = groups.map((g) =>
    sumMonetaryValues(g.items.map((i) => i.amount)),
  );
  const subtotal = sumMonetaryValues(subtotals);

  const taxShares = distributeProportionally(tax, subtotals);
  const extraShares = distributeProportionally(extra, subtotals);

  const categories: CategoryAllocation[] = groups.map((g, i) => {
    const groupSubtotal = subtotals[i]!;
    const allocatedTax = taxShares[i] ?? 0;
    const allocatedExtra = extraShares[i] ?? 0;
    return {
      categoryId: g.categoryId,
      subtotal: groupSubtotal,
      allocatedTax,
      allocatedExtra,
      total: roundToCents(groupSubtotal + allocatedTax + allocatedExtra),
      lineItems: g.items,
    };
  });

  const grandTotal = roundToCents(subtotal + tax + extra);
  const uncategorizedTotal = sumMonetaryValues(
    categories.filter((c) => c.categoryId === null).map((c) => c.total),
  );

  return {
    subtotal,
    tax,
    tip,
    otherFees,
    grandTotal,
    categories,
    uncategorizedTotal,
  };
}
