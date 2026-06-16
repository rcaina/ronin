import { HttpError } from "@/lib/errors";
import { buildReceiptPrompt, parseReceiptResponse } from "./prompt";
import type {
  ReceiptExtractor,
  ReceiptExtractionRequest,
} from "./types";

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

/**
 * Google Gemini via the REST API (no SDK dependency, so it stays decoupled
 * from any vendor client version). Uses responseMimeType: application/json to
 * force a JSON body, then validates with the shared parser.
 */
export class GeminiReceiptExtractor implements ReceiptExtractor {
  readonly provider = "gemini";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async extractReceipt(
    request: ReceiptExtractionRequest,
  ): Promise<ReturnType<typeof parseReceiptResponse>> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: request.mediaType,
                  data: request.imageBase64,
                },
              },
              { text: buildReceiptPrompt(request.categories) },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
        },
      }),
    });

    if (!response.ok) {
      const detail = await safeErrorText(response);
      throw new HttpError(
        `Receipt scan failed (Gemini ${response.status}).`,
        502,
        detail ? { detail } : undefined,
      );
    }

    const data = (await response.json()) as GeminiResponse;

    if (data.promptFeedback?.blockReason) {
      throw new HttpError(
        "The receipt image was rejected by the AI provider. Please try another photo.",
        502,
      );
    }

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("") ?? "";

    if (!text.trim()) {
      throw new HttpError("Could not read the receipt. Please try another photo.", 502);
    }

    return parseReceiptResponse(text);
  }
}

async function safeErrorText(response: Response): Promise<string | undefined> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return undefined;
  }
}
