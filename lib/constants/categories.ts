import { CategoryType } from "@prisma/client";

/** Template categories every new account starts with. */
export const STARTER_CATEGORIES = [
  { name: "Housing", group: CategoryType.NEEDS },
  { name: "Food & Groceries", group: CategoryType.NEEDS },
  { name: "Transportation", group: CategoryType.NEEDS },
  { name: "Entertainment", group: CategoryType.WANTS },
  { name: "Shopping", group: CategoryType.WANTS },
  { name: "Investments", group: CategoryType.INVESTMENT },
  { name: "Emergency Fund", group: CategoryType.INVESTMENT },
];
