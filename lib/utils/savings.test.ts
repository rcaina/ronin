import { describe, expect, it } from "vitest";
import { flattenAllocations } from "./savings";
import type { PocketSummary } from "@/lib/types/savings";

const pocket = (
  name: string,
  allocations: PocketSummary["allocations"],
): PocketSummary => ({
  id: `pocket-${name}`,
  name,
  total: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  locked: false,
  allocations,
});

const allocation = (
  id: string,
  createdAt: string,
  occurredAt?: string,
): NonNullable<PocketSummary["allocations"]>[number] => ({
  id,
  amount: 10,
  withdrawal: false,
  createdAt,
  occurredAt,
});

describe("flattenAllocations", () => {
  it("sorts across pockets rather than grouping by pocket", () => {
    const result = flattenAllocations([
      pocket("Vacation", [
        allocation("a-new", "2026-03-01T00:00:00.000Z"),
        allocation("a-old", "2026-01-01T00:00:00.000Z"),
      ]),
      pocket("Emergency", [
        allocation("b-newest", "2026-04-01T00:00:00.000Z"),
        allocation("b-mid", "2026-02-01T00:00:00.000Z"),
      ]),
    ]);

    expect(result.map((a) => a.id)).toEqual([
      "b-newest",
      "a-new",
      "b-mid",
      "a-old",
    ]);
  });

  it("orders by occurredAt when set, falling back to createdAt", () => {
    const result = flattenAllocations([
      pocket("Vacation", [
        // Recorded today but backdated — belongs at the bottom.
        allocation("backdated", "2026-06-01T00:00:00.000Z", "2026-01-05"),
        allocation("recorded", "2026-03-01T00:00:00.000Z"),
      ]),
    ]);

    expect(result.map((a) => a.id)).toEqual(["recorded", "backdated"]);
  });

  it("breaks occurredAt ties on createdAt, newest first", () => {
    const result = flattenAllocations([
      pocket("Vacation", [
        allocation("first", "2026-03-01T09:00:00.000Z", "2026-03-01"),
        allocation("second", "2026-03-01T17:00:00.000Z", "2026-03-01"),
      ]),
    ]);

    expect(result.map((a) => a.id)).toEqual(["second", "first"]);
  });

  it("keeps every allocation from every pocket", () => {
    const result = flattenAllocations([
      pocket("Vacation", [allocation("a", "2026-01-01T00:00:00.000Z")]),
      pocket("Emergency", [
        allocation("b", "2026-02-01T00:00:00.000Z"),
        allocation("c", "2026-03-01T00:00:00.000Z"),
      ]),
      pocket("Empty", []),
    ]);

    expect(result).toHaveLength(3);
    expect(result.map((a) => a.pocketName)).toEqual([
      "Emergency",
      "Emergency",
      "Vacation",
    ]);
  });

  it("returns an empty list when there are no pockets", () => {
    expect(flattenAllocations(undefined)).toEqual([]);
  });
});
