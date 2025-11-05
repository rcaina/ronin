import type { CreateSavingsSchema } from "@/lib/api-schemas/savings";

export const getSavings = () => fetch("/api/savings");

export const addSavings = (data: CreateSavingsSchema) => fetch("/api/savings", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});