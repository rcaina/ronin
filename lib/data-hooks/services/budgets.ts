import { type Budget } from "@prisma/client";

export const getBudgets = async (): Promise<Budget[]> => fetch("/api/budgets").then((res) => res.json()) as Promise<Budget[]>




