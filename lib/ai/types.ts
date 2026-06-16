import type { ReceiptExtraction } from "@/lib/api-schemas/receipt";

/** A budget category the model may assign line items to. */
export interface ReceiptCategoryInput {
  id: string;
  name: string;
  group: string;
}

export interface ReceiptExtractionRequest {
  /** Base64 image data (no data: prefix). */
  imageBase64: string;
  mediaType: string;
  categories: ReceiptCategoryInput[];
}

/**
 * Provider-agnostic receipt reader. Each backend (Gemini, Anthropic, …)
 * implements this; the rest of the app never imports a vendor SDK directly, so
 * switching providers is a config change. Implementations return raw model
 * output validated only for shape — category-id validation and all tax/total
 * math happen downstream.
 */
export interface ReceiptExtractor {
  readonly provider: string;
  extractReceipt(request: ReceiptExtractionRequest): Promise<ReceiptExtraction>;
}
