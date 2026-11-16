import { describe, expect, it } from "vitest";
import { safeCallbackPath } from "@/lib/utils/safe-redirect";

const origin = "https://ronin.app";

describe("safeCallbackPath", () => {
  it("keeps the path, query and hash of a same-origin URL", () => {
    expect(
      safeCallbackPath(`${origin}/budgets/b1?month=2026-10#top`, origin),
    ).toBe("/budgets/b1?month=2026-10#top");
  });

  it("accepts a relative path", () => {
    expect(safeCallbackPath("/reports", origin)).toBe("/reports");
  });

  it("falls back to / without a callback", () => {
    expect(safeCallbackPath(null, origin)).toBe("/");
  });

  it("refuses another origin, including protocol-relative and javascript: URLs", () => {
    expect(safeCallbackPath("https://evil.example/x", origin)).toBe("/");
    expect(safeCallbackPath("//evil.example/x", origin)).toBe("/");
    expect(safeCallbackPath("javascript:alert(1)", origin)).toBe("/");
  });

  it("refuses same-origin paths that normalize to a protocol-relative URL", () => {
    expect(safeCallbackPath("/.//evil.example", origin)).toBe("/");
    expect(safeCallbackPath("/%2e//evil.example", origin)).toBe("/");
    expect(safeCallbackPath("/./\\evil.example", origin)).toBe("/");
  });
});
