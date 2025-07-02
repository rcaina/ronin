import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCategories, deleteCategory, createCategory, updateCategory, type CreateCategoryRequest, type GroupedCategories } from "@/lib/data-hooks/services/categories";
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
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["categories"] });

      // Snapshot the previous value
      const previousCategories = queryClient.getQueryData(["categories"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["categories"], (old: GroupedCategories | undefined) => {
        if (!old) return old;

        const updatedCategories: GroupedCategories = { ...old };
        
        // Remove from old group
        if (data.group !== old.wants.find((cat) => cat.id === id)?.group) {
          updatedCategories.wants = old.wants.filter((cat) => cat.id !== id);
        }
        if (data.group !== old.needs.find((cat) => cat.id === id)?.group) {
          updatedCategories.needs = old.needs.filter((cat) => cat.id !== id);
        }
        if (data.group !== old.investment.find((cat) => cat.id === id)?.group) {
          updatedCategories.investment = old.investment.filter((cat) => cat.id !== id);
        }

        // Add to new group
        const categoryToUpdate = [
          ...(old.wants || []),
          ...(old.needs || []),
          ...(old.investment || []),
        ].find((cat) => cat.id === id);

        if (categoryToUpdate) {
          const updatedCategory = {
            ...categoryToUpdate,
            name: data.name,
            group: data.group,
          };

          switch (data.group) {
            case "WANTS":
              updatedCategories.wants = [...(updatedCategories.wants || []), updatedCategory];
              break;
            case "NEEDS":
              updatedCategories.needs = [...(updatedCategories.needs || []), updatedCategory];
              break;
            case "INVESTMENT":
              updatedCategories.investment = [...(updatedCategories.investment || []), updatedCategory];
              break;
          }
        }

        return updatedCategories;
      });

      // Return a context object with the snapshotted value
      return { previousCategories };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousCategories) {
        queryClient.setQueryData(["categories"], context.previousCategories);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
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



