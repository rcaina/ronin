import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getBudget } from "../services/budgets";
import type { BudgetWithRelations } from "@/lib/types/budget";

/** `month` ("YYYY-MM") scopes a continuous budget to that month; event budgets ignore it. */
export const useBudget = (
  id: string,
  excludeCardPayments?: boolean,
  month?: string,
) => {
  const { data: session } = useSession();

  const query = useQuery<BudgetWithRelations>({
    queryKey: ["budget", id, excludeCardPayments, month],
    queryFn: () => getBudget(id, excludeCardPayments, month),
    placeholderData: keepPreviousData,
    enabled: !!session && !!id,
    staleTime: 2 * 60 * 1000,
  });

  return query;
};
