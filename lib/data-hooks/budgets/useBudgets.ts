import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getBudgets } from "../services/budgets";

export const useBudgets = () => {
  const { data: session } = useSession();

  const query = useQuery({
    queryKey: ["budgets"],
    queryFn: () => getBudgets(),
    placeholderData: keepPreviousData,
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  });

  return query;
};



