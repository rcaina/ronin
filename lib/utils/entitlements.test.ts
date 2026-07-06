import { describe, expect, it } from "vitest";
import {
  FREE_LIMITS,
  canCreateBudget,
  canCreatePocket,
  canCreateRecurring,
  canImportTransactions,
  canInviteMember,
  canScanReceipt,
  canSplitTransactions,
  canViewReportHistory,
  isBudgetLocked,
  isPocketLocked,
  isPremium,
  lockedIds,
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

describe("canViewReportHistory", () => {
  it("denies a FREE account, with an upgrade reason", () => {
    const result = canViewReportHistory(account());
    expect(result.allowed).toBe(false);
    expect(!result.allowed && result.reason).toMatch(/premium/i);
  });

  it("allows a premium account", () => {
    expect(
      canViewReportHistory(
        account({ plan: "PREMIUM", subscriptionStatus: "ACTIVE" }),
      ).allowed,
    ).toBe(true);
  });

  it("allows a complimentary account even on the FREE plan", () => {
    expect(
      canViewReportHistory(account({ complimentaryAccess: true })).allowed,
    ).toBe(true);
  });
});

describe("canSplitTransactions", () => {
  it("allows a complimentary account even on the FREE plan", () => {
    expect(
      canSplitTransactions(account({ complimentaryAccess: true })).allowed,
    ).toBe(true);
  });

  it("allows PREMIUM + ACTIVE", () => {
    expect(
      canSplitTransactions(
        account({ plan: "PREMIUM", subscriptionStatus: "ACTIVE" }),
      ).allowed,
    ).toBe(true);
  });

  it("allows PREMIUM + CANCELED with a future currentPeriodEnd", () => {
    expect(
      canSplitTransactions(
        account({
          plan: "PREMIUM",
          subscriptionStatus: "CANCELED",
          currentPeriodEnd: new Date("2099-01-01"),
        }),
      ).allowed,
    ).toBe(true);
  });

  it("denies a FREE account with a reason", () => {
    const result = canSplitTransactions(account());
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBeTruthy();
    }
  });

  it("denies PREMIUM + CANCELED with a past currentPeriodEnd", () => {
    expect(
      canSplitTransactions(
        account({
          plan: "PREMIUM",
          subscriptionStatus: "CANCELED",
          currentPeriodEnd: new Date("2020-01-01"),
        }),
      ).allowed,
    ).toBe(false);
  });
});

describe("canImportTransactions", () => {
  it("denies a FREE account with an upgrade reason", () => {
    const result = canImportTransactions(account());
    expect(result.allowed).toBe(false);
    expect(!result.allowed && result.reason).toMatch(/premium/i);
  });

  it("allows a premium account", () => {
    expect(
      canImportTransactions(
        account({ plan: "PREMIUM", subscriptionStatus: "ACTIVE" }),
      ).allowed,
    ).toBe(true);
  });

  it("allows a complimentary account even on the FREE plan", () => {
    expect(
      canImportTransactions(account({ complimentaryAccess: true })).allowed,
    ).toBe(true);
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

describe("canCreateRecurring", () => {
  it("denies a FREE account even with zero existing templates", () => {
    const result = canCreateRecurring(account(), 0);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBeTruthy();
    }
  });

  it("allows a premium account regardless of template count", () => {
    expect(
      canCreateRecurring(
        account({ plan: "PREMIUM", subscriptionStatus: "ACTIVE" }),
        50,
      ).allowed,
    ).toBe(true);
  });

  it("allows a complimentary account even on the FREE plan", () => {
    expect(
      canCreateRecurring(account({ complimentaryAccess: true }), 0).allowed,
    ).toBe(true);
  });
});

const premium = account({ plan: "PREMIUM", subscriptionStatus: "ACTIVE" });

// Helper: build a lockable item with an explicit createdAt (day offset from a
// fixed epoch — higher `day` = newer).
const item = (id: string, day: number): { id: string; createdAt: Date } => ({
  id,
  createdAt: new Date(2026, 0, day),
});

describe("lockedIds", () => {
  it("returns an empty set for a premium account", () => {
    const items = [item("a", 1), item("b", 2), item("c", 3)];
    expect(lockedIds(premium, items, 1).size).toBe(0);
  });

  it("returns an empty set when under the limit", () => {
    const items = [item("a", 1), item("b", 2)];
    expect(lockedIds(account(), items, 3).size).toBe(0);
  });

  it("returns an empty set when exactly at the limit", () => {
    const items = [item("a", 1), item("b", 2), item("c", 3)];
    expect(lockedIds(account(), items, 3).size).toBe(0);
  });

  it("locks the oldest items beyond the newest `limit`", () => {
    const items = [item("a", 1), item("b", 2), item("c", 3), item("d", 4)];
    // Newest-first: d(4), c(3), b(2), a(1). limit 2 keeps d,c and locks b,a.
    expect(lockedIds(account(), items, 2)).toEqual(new Set(["a", "b"]));
  });

  it("locks nothing when limit is 0? keeps newest `limit`", () => {
    const items = [item("a", 1), item("b", 2), item("c", 3)];
    expect(lockedIds(account(), items, 1)).toEqual(new Set(["a", "b"]));
  });

  it("breaks createdAt ties by id (larger id is newer, kept)", () => {
    // Same createdAt for all — tiebreak by id desc. Newest-first: c, b, a.
    const items = [item("a", 5), item("b", 5), item("c", 5)];
    expect(lockedIds(account(), items, 1)).toEqual(new Set(["a", "b"]));
  });
});

describe("isBudgetLocked", () => {
  const activeBudgets = [
    { id: "old", status: "ACTIVE" as const, createdAt: new Date(2026, 0, 1) },
    { id: "new", status: "ACTIVE" as const, createdAt: new Date(2026, 0, 2) },
  ];

  it("is false for a premium account even when over the limit", () => {
    const oldBudget = activeBudgets[0]!;
    expect(isBudgetLocked(premium, oldBudget, activeBudgets)).toBe(false);
  });

  it("is false for a non-active budget regardless of count", () => {
    const archived = {
      id: "arch",
      status: "ARCHIVED" as const,
      createdAt: new Date(2026, 0, 1),
    };
    // Include a bunch of newer active budgets — still not locked because the
    // budget itself isn't ACTIVE.
    expect(
      isBudgetLocked(account(), archived, [
        ...activeBudgets,
        { id: "x", status: "ACTIVE" as const, createdAt: new Date(2026, 0, 9) },
      ]),
    ).toBe(false);
  });

  it("locks the older active budget when a newer one exists (limit 1)", () => {
    const oldBudget = activeBudgets[0]!;
    expect(isBudgetLocked(account(), oldBudget, activeBudgets)).toBe(true);
  });

  it("does not lock the newest active budget", () => {
    const newBudget = activeBudgets[1]!;
    expect(isBudgetLocked(account(), newBudget, activeBudgets)).toBe(false);
  });

  it("does not lock when exactly at the limit (single active budget)", () => {
    const only = activeBudgets[1]!;
    expect(isBudgetLocked(account(), only, [only])).toBe(false);
  });

  it("breaks createdAt ties by id when deciding newer active budgets", () => {
    const sameDay = [
      { id: "aaa", status: "ACTIVE" as const, createdAt: new Date(2026, 0, 1) },
      { id: "bbb", status: "ACTIVE" as const, createdAt: new Date(2026, 0, 1) },
    ];
    // bbb > aaa so bbb is newer and kept; aaa locks under limit 1.
    expect(isBudgetLocked(account(), sameDay[0]!, sameDay)).toBe(true);
    expect(isBudgetLocked(account(), sameDay[1]!, sameDay)).toBe(false);
  });
});

describe("isPocketLocked", () => {
  const pockets = [item("p1", 1), item("p2", 2), item("p3", 3), item("p4", 4)];

  it("is false for a premium account even when over the limit", () => {
    expect(isPocketLocked(premium, pockets[0]!, pockets)).toBe(false);
  });

  it("does not lock when under the limit", () => {
    const few = [item("p1", 1), item("p2", 2)];
    expect(isPocketLocked(account(), few[0]!, few)).toBe(false);
  });

  it("does not lock when exactly at the limit", () => {
    const three = [item("p1", 1), item("p2", 2), item("p3", 3)];
    expect(isPocketLocked(account(), three[0]!, three)).toBe(false);
  });

  it("locks the oldest pockets beyond the newest maxPockets", () => {
    // maxPockets = 3; newest-first p4,p3,p2,p1 — p1 has 3 newer, so it locks.
    expect(isPocketLocked(account(), pockets[0]!, pockets)).toBe(true);
    // p2 has only 2 newer (p3, p4) — not locked.
    expect(isPocketLocked(account(), pockets[1]!, pockets)).toBe(false);
  });

  it("breaks createdAt ties by id", () => {
    const sameDay = [item("a", 5), item("b", 5), item("c", 5), item("d", 5)];
    // Newest-first by id desc: d,c,b,a. maxPockets 3 keeps d,c,b; a locks.
    expect(isPocketLocked(account(), sameDay[0]!, sameDay)).toBe(true);
    expect(isPocketLocked(account(), sameDay[1]!, sameDay)).toBe(false);
  });
});
