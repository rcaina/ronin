import { type Category } from "@prisma/client";
import type {
  GroupedCategories,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "@/lib/types/category";

export const getCategories = async (): Promise<GroupedCategories> =>
  fetch("/api/categories").then((res) =>
    res.json(),
  ) as Promise<GroupedCategories>;

export const createCategory = async (
  data: CreateCategoryRequest,
): Promise<Category> => {
  const response = await fetch("/api/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to create category: ${response.statusText}`);
  }
  return response.json() as Promise<Category>;
};

export const updateCategory = async (
  id: string,
  data: UpdateCategoryRequest,
): Promise<Category> => {
  const response = await fetch(`/api/categories/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to update category: ${response.statusText}`);
  }
  return response.json() as Promise<Category>;
};

export const deleteCategory = async (id: string): Promise<void> => {
  const response = await fetch(`/api/categories/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete category: ${response.statusText}`);
  }
};
