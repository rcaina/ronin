import Anthropic from "@anthropic-ai/sdk";
import { HttpError } from "@/lib/errors";
import { buildReceiptPrompt, parseReceiptResponse } from "./prompt";
import type {
  ReceiptExtractor,
  ReceiptExtractionRequest,
} from "./types";

type AnthropicMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/**
 * Anthropic Claude implementation. Requests JSON via the prompt and validates
 * with the shared parser (same contract as every other provider).
 */
export class AnthropicReceiptExtractor implements ReceiptExtractor {
  readonly provider = "anthropic";
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async extractReceipt(
    request: ReceiptExtractionRequest,
  ): Promise<ReturnType<typeof parseReceiptResponse>> {
    let message;
    try {
      message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: request.mediaType as AnthropicMediaType,
                  data: request.imageBase64,
                },
              },
              { type: "text", text: buildReceiptPrompt(request.categories) },
            ],
          },
        ],
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : undefined;
      throw new HttpError(
        "Receipt scan failed (Anthropic).",
        502,
        detail ? { detail } : undefined,
      );
    }

    if (message.stop_reason === "refusal") {
      throw new HttpError(
        "The receipt image was rejected by the AI provider. Please try another photo.",
        502,
      );
    }

    const text = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");

    if (!text.trim()) {
      throw new HttpError("Could not read the receipt. Please try another photo.", 502);
    }

    return parseReceiptResponse(text);
  }
}
