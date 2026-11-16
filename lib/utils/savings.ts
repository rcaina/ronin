import { roundToCents } from "@/lib/utils";
import type { AllocationSummary, PocketSummary } from "@/lib/types/savings";

export type AllocationWithPocket = AllocationSummary & {
  pocketName: string;
  pocketId: string;
};

// The date an allocation is ordered by: when it happened if the user set that,
// otherwise when it was recorded.
const allocationTime = (allocation: AllocationSummary): number =>
  new Date(allocation.occurredAt ?? allocation.createdAt).getTime();

/**
 * Every pocket's allocations as one list, most recent first. The API only sorts
 * allocations within a pocket, so flattening on its own leaves the list grouped
 * by pocket — this re-sorts across pockets, falling back to `createdAt` so
 * allocations sharing an `occurredAt` date keep a stable, newest-first order.
 */
export function flattenAllocations(
  pockets: PocketSummary[] | undefined,
): AllocationWithPocket[] {
  return (pockets ?? [])
    .flatMap((pocket) =>
      (pocket.allocations ?? []).map((allocation) => ({
        ...allocation,
        pocketName: pocket.name,
        pocketId: pocket.id,
      })),
    )
    .sort(
      (a, b) =>
        allocationTime(b) - allocationTime(a) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export interface GoalProgress {
  saved: number;
  goal: number;
  percentage: number;
  goals: number;
  reached: number;
}

/** Progress over the pockets that have a goal: each pocket counts up to its own goal, so one overfunded pocket can't hide another. Null when no pocket has a goal. */
export function getGoalProgress(
  pockets: Pick<PocketSummary, "total" | "goalAmount">[] | undefined,
): GoalProgress | null {
  const withGoal = (pockets ?? []).filter(
    (p): p is { total: number; goalAmount: number } =>
      typeof p.goalAmount === "number" && p.goalAmount > 0,
  );
  if (withGoal.length === 0) return null;

  const goal = roundToCents(withGoal.reduce((sum, p) => sum + p.goalAmount, 0));
  const saved = roundToCents(
    withGoal.reduce(
      (sum, p) => sum + Math.max(0, Math.min(p.total, p.goalAmount)),
      0,
    ),
  );
  return {
    saved,
    goal,
    percentage: roundToCents((saved / goal) * 100),
    goals: withGoal.length,
    reached: withGoal.filter((p) => p.total >= p.goalAmount).length,
  };
}
