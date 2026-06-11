import type {
  Budget,
  Category,
  Transaction,
  CategoryType,
  Card,
  CardType,
  PeriodType,
  StrategyType,
  TransactionType,
} from "@prisma/client";

export type SerializedBudget = Omit<
  Budget,
  "startAt" | "endAt" | "deleted" | "createdAt" | "updatedAt"
> & {
  // API responses serialize Date fields to ISO strings via JSON.stringify/NextResponse.json.
  startAt: string;
  endAt: string;
  deleted: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BudgetWithRelations = SerializedBudget & {
  categories: (Category & {
    transactions: Transaction[];
  })[];
  transactions: Transaction[];
  cards?: (Card & {
    user: {
      id: string;
      name: string;
      firstName: string;
      lastName: string;
    };
  })[];
};

export type BudgetCategoryWithRelations = Category & {
  transactions: Transaction[];
};

export type CategoryTemplate = {
  id: string;
  name: string;
  group: CategoryType;
  createdAt: string;
  updatedAt: string;
};

export type CategoriesByGroup = Record<string, BudgetCategoryWithCategory[]>;

export type GroupColorFunction = (group: CategoryType) => string;
export type GroupLabelFunction = (group: CategoryType) => string;

// Budget create/update payloads (shared by API services and client services)

export interface CreateBudgetData {
  name: string;
  strategy: StrategyType;
  period: PeriodType;
  startAt: string;
  endAt: string;
  isRecurring: boolean;
  // If false, we skip auto-creating the default "Main" debit card because
  // the client will (or already does) copy/add at least one debit card.
  shouldCreateDefaultDebitCard?: boolean;
  categoryAllocations?: Array<{
    name: string;
    group: CategoryType;
    allocatedAmount: number;
  }>;
  incomes?: Array<{
    amount: number;
    source: string;
    description?: string;
    isPlanned: boolean;
    frequency: PeriodType;
  }>;
}

export interface CardToIncludeData {
  name: string;
  cardType: CardType;
  spendingLimit?: number;
  userId: string;
}

export interface CreateBudgetWithCardsData {
  name: string;
  strategy: StrategyType;
  period: PeriodType;
  startAt: string;
  endAt: string;
  isRecurring: boolean;
  categoryAllocations?: Array<{
    name: string;
    group: CategoryType;
    allocatedAmount: number;
  }>;
  incomes?: Array<{
    amount: number;
    source: string;
    description?: string;
    isPlanned: boolean;
    frequency: PeriodType;
  }>;
  cardsToInclude?: CardToIncludeData[];
}

export interface UpdateBudgetData {
  name?: string;
  strategy?: StrategyType;
  period?: PeriodType;
  startAt?: string;
  endAt?: string;
  isRecurring?: boolean;
  categoryAllocations?: Array<{
    name: string;
    group: CategoryType;
    allocatedAmount: number;
  }>;
}

// Budget categories as returned by /api/budgets/[id]/categories

export type BudgetCategories = (Category & {
  spentAmount: number;
  transactions: Array<{
    id: string;
    name: string | null;
    description: string | null;
    amount: number;
    transactionType: TransactionType;
    createdAt: string;
  }>;
})[];

export type BudgetCategoryWithCategory = {
  id: string;
  budgetId: string | null;
  name: string;
  group: string;
  allocatedAmount: number | null;
  spentAmount?: number;
  createdAt: Date;
  updatedAt: Date;
  deleted: Date | null;
  transactions: Array<{
    id: string;
    name: string | null;
    description: string | null;
    amount: number;
    transactionType: string;
    createdAt: Date;
  }>;
};

export interface CreateBudgetCategoryData {
  categoryName: string;
  group: CategoryType;
  allocatedAmount: number;
}

export interface UpdateBudgetCategoryData {
  allocatedAmount?: number;
  name?: string;
  group?: CategoryType;
}
