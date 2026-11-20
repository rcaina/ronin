import { describe, expect, it } from "vitest";
import { isHeaderlessOnMobile, isMobileTabRoot } from "./mobile-nav";

describe("isMobileTabRoot", () => {
  it("matches the bottom tabs and Recurring", () => {
    for (const path of ["/", "/budgets", "/transactions", "/transactions/recurring", "/savings"]) {
      expect(isMobileTabRoot(path)).toBe(true);
    }
  });

  it("rejects pages under a tab and the drawer pages", () => {
    for (const path of ["/budgets/abc", "/savings/abc/allocations", "/categories", "/cards/abc", null]) {
      expect(isMobileTabRoot(path)).toBe(false);
    }
  });
});

describe("isHeaderlessOnMobile", () => {
  it("keeps Overview's bar and drops every other page's", () => {
    expect(isHeaderlessOnMobile("/")).toBe(false);
    expect(isHeaderlessOnMobile(null)).toBe(false);
    expect(isHeaderlessOnMobile("/settings")).toBe(true);
    expect(isHeaderlessOnMobile("/budgets/abc/cards/def")).toBe(true);
  });
});
