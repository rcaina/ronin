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
