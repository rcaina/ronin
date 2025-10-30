import type { CreatePocketSchema } from "@/lib/api-schemas/savings";

export const getPockets = (savingsId?: string) => {
  const query = savingsId ? `?savingsId=${savingsId}` : "";
  return fetch(`/api/savings/pockets${query}`);
};

export const addPocket = (data: CreatePocketSchema) => fetch("/api/savings/pockets", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});


