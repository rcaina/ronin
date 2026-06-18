import type { ScanReceiptResult } from "@/lib/types/receipt";

export interface ScanReceiptRequest {
  budgetId: string;
  /** Base64 image data (no data: prefix). */
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

export const scanReceipt = async (
  data: ScanReceiptRequest,
): Promise<ScanReceiptResult> => {
  const response = await fetch("/api/transactions/scan-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(error?.message ?? "Failed to scan receipt");
  }

  return response.json() as Promise<ScanReceiptResult>;
};
