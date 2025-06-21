import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getTransactions } from "../services/transactions";
import type { TransactionWithRelations } from "../services/transactions";

export const useTransactions = () => {
  const { data: session } = useSession();

  const query = useQuery<TransactionWithRelations[]>({
    queryKey: ["transactions"],
    queryFn: () => getTransactions(),
    placeholderData: keepPreviousData,
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  });

  return query;
}; 