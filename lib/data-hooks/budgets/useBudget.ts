import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getBudget } from "../services/budgets";
import type { BudgetWithRelations } from "@/lib/types/budget";

export const useBudget = (id: string, excludeCardPayments?: boolean) => {
  const { data: session } = useSession();

  const query = useQuery<BudgetWithRelations>({
    queryKey: ["budget", id, excludeCardPayments],
    queryFn: () => getBudget(id, excludeCardPayments),
    placeholderData: keepPreviousData,
    enabled: !!session && !!id,
    staleTime: 2 * 60 * 1000,
  });

  return query;
}; 