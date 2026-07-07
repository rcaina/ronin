import type { CreatePocketSchema } from "@/lib/api-schemas/savings";
import type { PocketSummary } from "@/lib/types/savings";
import { parseErrorResponse } from "./http";

export const getPockets = (savingsId?: string) => {
  const query = savingsId ? `?savingsId=${savingsId}` : "";
  return fetch(`/api/savings/pockets${query}`);
};

export const addPocket = async (
  data: CreatePocketSchema,
): Promise<PocketSummary> => {
  const response = await fetch("/api/savings/pockets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) return parseErrorResponse(response);

  return response.json() as Promise<PocketSummary>;
};
