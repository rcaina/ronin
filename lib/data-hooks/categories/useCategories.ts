import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getCategories } from "@/lib/data-hooks/services/categories";
import { useSession } from "next-auth/react";

export const useCategories = () => {
  const { data: session } = useSession();

  const query = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    placeholderData: keepPreviousData,
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  });

  return query;
};



