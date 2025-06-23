import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCategories, deleteCategory, createCategory, updateCategory, type CreateCategoryRequest } from "@/lib/data-hooks/services/categories";
import { useSession } from "next-auth/react";
import { type CategoryType } from "@prisma/client";

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

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryRequest) => createCategory(data),
    onSuccess: () => {
      // Invalidate and refetch categories
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; group: CategoryType } }) =>
      updateCategory(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      // Invalidate and refetch categories
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};



