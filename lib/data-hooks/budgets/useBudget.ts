import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getBudget } from "../services/budgets";
import type { BudgetWithRelations } from "@/lib/types/budget";

export const useBudget = (id: string) => {
  const { data: session } = useSession();

  const query = useQuery<BudgetWithRelations>({
    queryKey: ["budget", id],
    queryFn: () => getBudget(id),
    placeholderData: keepPreviousData,
    enabled: !!session && !!id,
    staleTime: 2 * 60 * 1000,
  });

  return query;
}; 