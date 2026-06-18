import { env } from "@/env";
import { HttpError } from "@/lib/errors";
import { GeminiReceiptExtractor } from "./gemini";
import { AnthropicReceiptExtractor } from "./anthropic";
import type { ReceiptExtractor } from "./types";

export type { ReceiptExtractor, ReceiptExtractionRequest } from "./types";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_ANTHROPIC_MODEL = "claude-opus-4-8";

/**
 * Resolves the configured receipt-reading provider. Explicit AI_PROVIDER wins;
 * otherwise we auto-detect from whichever key is set, preferring Gemini (free
 * tier). Throws a 503 if nothing is configured so the route can surface a clear
 * "not set up" message.
 */
export function getReceiptExtractor(): ReceiptExtractor {
  const provider =
    env.AI_PROVIDER ??
    (env.GEMINI_API_KEY
      ? "gemini"
      : env.ANTHROPIC_API_KEY
        ? "anthropic"
        : null);

  switch (provider) {
    case "gemini":
      if (!env.GEMINI_API_KEY) {
        throw new HttpError("GEMINI_API_KEY is not set.", 503);
      }
      return new GeminiReceiptExtractor(
        env.GEMINI_API_KEY,
        env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL,
      );

    case "anthropic":
      if (!env.ANTHROPIC_API_KEY) {
        throw new HttpError("ANTHROPIC_API_KEY is not set.", 503);
      }
      return new AnthropicReceiptExtractor(
        env.ANTHROPIC_API_KEY,
        env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL,
      );

    default:
      throw new HttpError(
        "Receipt scanning is not configured. Set GEMINI_API_KEY or ANTHROPIC_API_KEY.",
        503,
      );
  }
}
