import { useMutation } from "@tanstack/react-query";
import {
  scanReceipt,
  type ScanReceiptRequest,
} from "../services/receipts";

/**
 * Sends a receipt image to the AI scan endpoint and returns the extraction +
 * budget categories for the review screen. Read-only — no cache invalidation
 * (nothing is persisted until the user approves and we batch-create).
 */
export const useScanReceipt = () => {
  return useMutation({
    mutationFn: (data: ScanReceiptRequest) => scanReceipt(data),
  });
};
