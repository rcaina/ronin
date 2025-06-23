import { type Category, type CategoryType } from "@prisma/client";

export interface GroupedCategories {
  wants: Array<{
    id: string;
    name: string;
    group: CategoryType;
    createdAt: string;
    updatedAt: string;
  }>;
  needs: Array<{
    id: string;
    name: string;
    group: CategoryType;
    createdAt: string;
    updatedAt: string;
  }>;
  investment: Array<{
    id: string;
    name: string;
    group: CategoryType;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface CreateCategoryRequest {
  name: string;
  group: CategoryType;
}

export interface UpdateCategoryRequest {
  name: string;
  group: CategoryType;
}

export const getCategories = async (): Promise<GroupedCategories> => fetch("/api/categories").then((res) => res.json()) as Promise<GroupedCategories>

export const createCategory = async (data: CreateCategoryRequest): Promise<Category> => {
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

export const updateCategory = async (id: string, data: UpdateCategoryRequest): Promise<Category> => {
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




