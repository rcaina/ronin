import { describe, expect, it } from "vitest";
import {
  FREE_LIMITS,
  canCreateBudget,
  canCreatePocket,
  canInviteMember,
  canScanReceipt,
  isPremium,
  type AccountEntitlementFields,
} from "@/lib/utils/entitlements";

const account = (
  overrides: Partial<AccountEntitlementFields> = {},
): AccountEntitlementFields => ({
  plan: "FREE",
  complimentaryAccess: false,
  subscriptionStatus: null,
  currentPeriodEnd: null,
  ...overrides,
});

describe("isPremium", () => {
  it("is false for a FREE plan account", () => {
    expect(isPremium(account())).toBe(false);
  });

  it("is true for PREMIUM + ACTIVE", () => {
    expect(
      isPremium(account({ plan: "PREMIUM", subscriptionStatus: "ACTIVE" })),
    ).toBe(true);
  });

  it("is true for PREMIUM + PAST_DUE (dunning grace period)", () => {
    expect(
      isPremium(account({ plan: "PREMIUM", subscriptionStatus: "PAST_DUE" })),
    ).toBe(true);
  });

  it("is true for PREMIUM + CANCELED with a future currentPeriodEnd", () => {
    const now = new Date("2026-06-15");
    expect(
      isPremium(
        account({
          plan: "PREMIUM",
          subscriptionStatus: "CANCELED",
          currentPeriodEnd: new Date("2026-07-01"),
        }),
        now,
      ),
    ).toBe(true);
  });

  it("is false for PREMIUM + CANCELED with a past currentPeriodEnd", () => {
    const now = new Date("2026-07-15");
    expect(
      isPremium(
        account({
          plan: "PREMIUM",
          subscriptionStatus: "CANCELED",
          currentPeriodEnd: new Date("2026-07-01"),
        }),
        now,
      ),
    ).toBe(false);
  });

  it("is false for PREMIUM + CANCELED with no currentPeriodEnd", () => {
    expect(
      isPremium(account({ plan: "PREMIUM", subscriptionStatus: "CANCELED" })),
    ).toBe(false);
  });

  it("complimentaryAccess overrides everything, including plan FREE and no subscriptionStatus", () => {
    expect(
      isPremium(
        account({
          plan: "FREE",
          complimentaryAccess: true,
          subscriptionStatus: null,
          currentPeriodEnd: null,
        }),
      ),
    ).toBe(true);
  });
});

describe("canCreateBudget", () => {
  it("denies a FREE account at the active-budget limit", () => {
    const result = canCreateBudget(account(), FREE_LIMITS.maxActiveBudgets);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBeTruthy();
    }
  });

  it("allows a FREE account under the active-budget limit", () => {
    expect(
      canCreateBudget(account(), FREE_LIMITS.maxActiveBudgets - 1).allowed,
    ).toBe(true);
  });

  it("allows a premium account regardless of active-budget count", () => {
    expect(
      canCreateBudget(
        account({ plan: "PREMIUM", subscriptionStatus: "ACTIVE" }),
        FREE_LIMITS.maxActiveBudgets + 10,
      ).allowed,
    ).toBe(true);
  });
});

describe("canInviteMember", () => {
  it("denies a FREE account at the member limit", () => {
    expect(canInviteMember(account(), FREE_LIMITS.maxMembers).allowed).toBe(
      false,
    );
  });

  it("allows a FREE account under the member limit", () => {
    expect(canInviteMember(account(), FREE_LIMITS.maxMembers - 1).allowed).toBe(
      true,
    );
  });

  it("allows a premium account regardless of member count", () => {
    expect(
      canInviteMember(
        account({ plan: "PREMIUM", subscriptionStatus: "ACTIVE" }),
        FREE_LIMITS.maxMembers + 10,
      ).allowed,
    ).toBe(true);
  });
});

describe("canScanReceipt", () => {
  it("denies a FREE account", () => {
    expect(canScanReceipt(account()).allowed).toBe(false);
  });

  it("allows a premium account", () => {
    expect(
      canScanReceipt(account({ plan: "PREMIUM", subscriptionStatus: "ACTIVE" }))
        .allowed,
    ).toBe(true);
  });

  it("allows a complimentary account even on the FREE plan", () => {
    expect(canScanReceipt(account({ complimentaryAccess: true })).allowed).toBe(
      true,
    );
  });
});

describe("canCreatePocket", () => {
  it("denies a FREE account at the pocket limit", () => {
    expect(canCreatePocket(account(), FREE_LIMITS.maxPockets).allowed).toBe(
      false,
    );
  });

  it("allows a FREE account under the pocket limit", () => {
    expect(canCreatePocket(account(), FREE_LIMITS.maxPockets - 1).allowed).toBe(
      true,
    );
  });

  it("allows a premium account regardless of pocket count", () => {
    expect(
      canCreatePocket(
        account({ plan: "PREMIUM", subscriptionStatus: "ACTIVE" }),
        FREE_LIMITS.maxPockets + 10,
      ).allowed,
    ).toBe(true);
  });
});
