import { type Category } from "@prisma/client";

export const getCategories = async (): Promise<Category[]> => fetch("/api/categories").then((res) => res.json()) as Promise<Category[]>




