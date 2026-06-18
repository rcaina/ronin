"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useCreateBudgetFromScratchWithCards,
  useDuplicateBudgetWithCards,
} from "@/lib/data-hooks/budgets/useBudgets";
import {
  StrategyType,
  PeriodType,
  CategoryType,
  TransactionType,
  type CardType,
} from "@prisma/client";
import {
  calculateAdjustedIncome,
  calculateEndDate,
  roundToCents,
} from "@/lib/utils";

// Import components
import BudgetStepsSidebar from "./BudgetStepsSidebar";
import BasicBudgetStep from "./BasicBudgetStep";
import IncomeStep from "./IncomeStep";
import CardsStep from "./CardsStep";
import CategoriesStep from "./CategoriesStep";
import AllocationStep from "./AllocationStep";
import PercentageAllocationStep from "./PercentageAllocationStep";
import type {
  CreateBudgetFormData,
  CategoryAllocation,
  IncomeEntry,
  StepType,
  CardToInclude,
} from "./types";
import type { BudgetWithRelations } from "@/lib/types/budget";
import { useLockBodyScroll } from "@/lib/utils/hooks";
import Button from "../Button";
import AddCardForm from "../cards/AddCardForm";

// Validation schema
const createBudgetSchema = z
  .object({
    name: z.string().min(1, "Budget name is required"),
    strategy: z.nativeEnum(StrategyType),
    period: z.nativeEnum(PeriodType),
    startAt: z.string().min(1, "Start date is required"),
    endAt: z.string().min(1, "End date is required"),
  })
  .refine(
    (data) => {
      // Parse dates explicitly to avoid timezone issues
      const startParts = data.startAt.split("-").map(Number);
      const endParts = data.endAt.split("-").map(Number);

      if (startParts.length !== 3 || endParts.length !== 3) {
        return false;
      }

      const [startYear, startMonth, startDay] = startParts;
      const [endYear, endMonth, endDay] = endParts;

      if (
        !startYear ||
        !startMonth ||
        !startDay ||
        !endYear ||
        !endMonth ||
        !endDay
      ) {
        return false;
      }

      const startDate = new Date(startYear, startMonth - 1, startDay);
      const endDate = new Date(endYear, endMonth - 1, endDay);
      return endDate >= startDate;
    },
    {
      message: "End date must be on or after start date",
      path: ["endAt"],
    },
  )
  .refine(
    (data) => {
      // For One Time budgets, allow manual end date
      if (data.period === PeriodType.ONE_TIME) {
        return true;
      }

      // For recurring periods, validate that end date matches the calculated end date
      const startParts = data.startAt.split("-").map(Number);
      const endParts = data.endAt.split("-").map(Number);

      if (startParts.length !== 3 || endParts.length !== 3) {
        return false;
      }

      const [startYear, startMonth, startDay] = startParts;
      const [endYear, endMonth, endDay] = endParts;

      if (
        !startYear ||
        !startMonth ||
        !startDay ||
        !endYear ||
        !endMonth ||
        !endDay
      ) {
        return false;
      }

      const startDate = new Date(startYear, startMonth - 1, startDay);
      const calculatedEndDate = calculateEndDate(startDate, data.period);
      const userEndDate = new Date(endYear, endMonth - 1, endDay);

      // Allow some tolerance for timezone differences (1 day)
      const diffTime = Math.abs(
        calculatedEndDate.getTime() - userEndDate.getTime(),
      );
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays <= 1;
    },
    {
      message: "End date should match the selected period",
      path: ["endAt"],
    },
  );

const formatDateForInput = (date: Date): string => {
  // Handle timezone issues by using local date methods
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialBudget?: BudgetWithRelations | null;
}

export default function CreateBudgetModal({
  isOpen,
  onClose,
  onSuccess,
  initialBudget,
}: CreateBudgetModalProps) {
  const createBudgetFromScratchMutation = useCreateBudgetFromScratchWithCards();
  const duplicateBudgetMutation = useDuplicateBudgetWithCards();
  const isCreating =
    createBudgetFromScratchMutation.isPending ||
    duplicateBudgetMutation.isPending;
  const [selectedCategories, setSelectedCategories] = useState<
    CategoryAllocation[]
  >([]);
  const [currentStep, setCurrentStep] = useState<StepType>("basic");
  const [cardsToInclude, setCardsToInclude] = useState<CardToInclude[]>([]);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [users, setUsers] = useState<
    Array<{
      id: string;
      name: string;
      firstName: string;
      lastName: string;
      email: string | null;
      role: string;
    }>
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([
    {
      id: "1",
      amount: 0,
      source: "",
      description: "",
      isPlanned: true,
      frequency: PeriodType.MONTHLY,
    },
  ]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<CreateBudgetFormData>({
    resolver: zodResolver(createBudgetSchema),
    defaultValues: {
      name: "",
      strategy: StrategyType.ZERO_SUM,
      period: PeriodType.MONTHLY,
      startAt: formatDateForInput(new Date()),
      endAt: formatDateForInput(
        calculateEndDate(new Date(), PeriodType.MONTHLY),
      ),
    },
  });

  // Prefill form when initialBudget is provided
  useEffect(() => {
    if (isOpen) {
      // Always reset to basic step when modal opens
      setCurrentStep("basic");

      if (initialBudget) {
        const startDate = new Date();
        const endDate = calculateEndDate(startDate, initialBudget.period);

        // Set form values
        setValue("name", `${initialBudget.name} (Copy)`);
        setValue("strategy", initialBudget.strategy);
        setValue("period", initialBudget.period);
        setValue("startAt", formatDateForInput(startDate));
        setValue("endAt", formatDateForInput(endDate));

        // Set income entries from income transactions
        const incomeTransactions = (initialBudget.transactions ?? []).filter(
          (transaction) =>
            transaction.transactionType === TransactionType.INCOME,
        );
        if (incomeTransactions.length > 0) {
          const entries: IncomeEntry[] = incomeTransactions.map(
            (transaction, index: number) => {
              return {
                id: (index + 1).toString(),
                amount: Number(transaction.amount),
                source: transaction.name ?? "",
                description: transaction.description ?? "",
                isPlanned: true, // Default since transactions don't have this field
                frequency: PeriodType.MONTHLY, // Default since transactions don't have this field
              };
            },
          );
          setIncomeEntries(entries);
        } else {
          setIncomeEntries([
            {
              id: "1",
              amount: 0,
              source: "",
              description: "",
              isPlanned: true,
              frequency: PeriodType.MONTHLY,
            },
          ]);
        }

        // Set categories
        if (initialBudget.categories && initialBudget.categories.length > 0) {
          const categories: CategoryAllocation[] = initialBudget.categories.map(
            (category, index) => ({
              categoryId: `temp-${Date.now()}-${index}`,
              name: category.name,
              group: category.group,
              allocatedAmount: category.allocatedAmount ?? 0,
            }),
          );
          setSelectedCategories(categories);
        } else {
          setSelectedCategories([]);
        }

        // Start with all cards from the initial budget (user can remove with Delete)
        const initialCards: CardToInclude[] =
          initialBudget.cards?.map((card) => ({
            id: card.id,
            name: card.name,
            lastFourDigits: card.lastFourDigits ?? undefined,
            cardType: card.cardType,
            spendingLimit: card.spendingLimit ?? undefined,
            userId: card.userId,
            user: card.user ?? undefined,
          })) ?? [];
        setCardsToInclude(initialCards);
      } else {
        // Reset to defaults when opening without initial budget
        reset();
        setSelectedCategories([]);
        setIncomeEntries([
          {
            id: "1",
            amount: 0,
            source: "",
            description: "",
            isPlanned: true,
            frequency: PeriodType.MONTHLY,
          },
        ]);
        setCardsToInclude([]);
      }

      setShowAddCardModal(false);
      setLoadingUsers(true);
      type UserRow = {
        id: string;
        name: string;
        firstName: string;
        lastName: string;
        email: string | null;
        role: string;
      };
      void fetch("/api/users")
        .then(async (res) => (res.ok ? ((await res.json()) as UserRow[]) : []))
        .then((data) => setUsers(Array.isArray(data) ? data : []))
        .catch(() => setUsers([]))
        .finally(() => setLoadingUsers(false));
    }
  }, [initialBudget, isOpen, setValue, reset]);

  const watchedName = watch("name");
  const watchedStartAt = watch("startAt");
  const watchedEndAt = watch("endAt");
  const watchedPeriod = watch("period");
  const watchedStrategy = watch("strategy");

  // 50/30/20 budgets get an express path: Basics → Income → Create. We
  // auto-generate Needs/Wants/Investments categories at 50/30/20 of income, so
  // the cards/categories/allocation steps are skipped. Duplicating an existing
  // budget keeps the full flow so the copied categories are preserved.
  const isExpress =
    !initialBudget && watchedStrategy === StrategyType.FIFTY_THIRTY_TWENTY;
  const visibleSteps: StepType[] = isExpress
    ? ["basic", "income"]
    : ["basic", "income", "cards", "categories", "allocation"];
  const isLastStep = isExpress
    ? currentStep === "income"
    : currentStep === "allocation";

  // Auto-calculate end date when period or start date changes
  useEffect(() => {
    if (watchedStartAt && watchedPeriod) {
      // Parse the date string more explicitly to avoid timezone issues
      const parts = watchedStartAt.split("-").map(Number);
      if (parts.length === 3) {
        const year = parts[0]!;
        const month = parts[1]!;
        const day = parts[2]!;
        const startDate = new Date(year, month - 1, day); // month is 0-indexed
        const endDate = calculateEndDate(startDate, watchedPeriod);
        setValue("endAt", formatDateForInput(endDate));
      }
    }
  }, [watchedStartAt, watchedPeriod, setValue]);

  // Handle period change
  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPeriod = e.target.value as PeriodType;
    setValue("period", newPeriod);

    // Recalculate end date
    if (watchedStartAt) {
      const parts = watchedStartAt.split("-").map(Number);
      if (parts.length === 3) {
        const year = parts[0]!;
        const month = parts[1]!;
        const day = parts[2]!;
        const startDate = new Date(year, month - 1, day);
        const endDate = calculateEndDate(startDate, newPeriod);
        setValue("endAt", formatDateForInput(endDate));
      }
    }
  };

  // Handle start date change
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setValue("startAt", newStartDate);

    // Recalculate end date
    if (newStartDate && watchedPeriod) {
      const parts = newStartDate.split("-").map(Number);
      if (parts.length === 3) {
        const year = parts[0]!;
        const month = parts[1]!;
        const day = parts[2]!;
        const startDate = new Date(year, month - 1, day);
        const endDate = calculateEndDate(startDate, watchedPeriod);
        setValue("endAt", formatDateForInput(endDate));
      }
    }
  };

  // Start with no categories selected (run once on mount)
  useEffect(() => {
    setSelectedCategories([]);
  }, []);

  const handleAddCategory = (category: {
    name: string;
    group: CategoryType;
  }) => {
    // Generate a unique ID for the new category
    const newId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSelectedCategories((prev) => [
      ...prev,
      {
        categoryId: newId,
        name: category.name,
        group: category.group,
        allocatedAmount: 0,
      },
    ]);
  };

  const handleRemoveCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.filter((cat) => cat.categoryId !== categoryId),
    );
  };

  const handleAllocationChange = (categoryId: string, amount: number) => {
    setSelectedCategories((prev) =>
      prev.map((cat) =>
        cat.categoryId === categoryId
          ? { ...cat, allocatedAmount: amount }
          : cat,
      ),
    );
  };

  const handleNext = () => {
    if (currentStep === "basic") setCurrentStep("income");
    else if (currentStep === "income") setCurrentStep("cards");
    else if (currentStep === "cards") setCurrentStep("categories");
    else if (currentStep === "categories") setCurrentStep("allocation");
  };

  const handleNextClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleNext();
  };

  const handleBack = () => {
    if (currentStep === "income") setCurrentStep("basic");
    else if (currentStep === "cards") setCurrentStep("income");
    else if (currentStep === "categories") setCurrentStep("cards");
    else if (currentStep === "allocation") setCurrentStep("categories");
  };

  // Only allow jumping back to completed steps or the current step.
  const handleStepClick = (step: StepType) => {
    const currentIndex = visibleSteps.indexOf(currentStep);
    const targetIndex = visibleSteps.indexOf(step);
    if (targetIndex <= currentIndex) {
      setCurrentStep(step);
    }
  };

  const resetModal = () => {
    reset();
    setSelectedCategories([]);
    setCardsToInclude([]);
    setShowAddCardModal(false);
    setIncomeEntries([
      {
        id: "1",
        amount: 0,
        source: "",
        description: "",
        isPlanned: true,
        frequency: PeriodType.MONTHLY,
      },
    ]);
    setCurrentStep("basic");
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const addIncomeEntry = () => {
    const newId = (incomeEntries.length + 1).toString();
    setIncomeEntries([
      ...incomeEntries,
      {
        id: newId,
        amount: 0,
        source: "",
        description: "",
        isPlanned: true,
        frequency: PeriodType.MONTHLY,
      },
    ]);
  };

  const removeIncomeEntry = (id: string) => {
    if (incomeEntries.length > 1) {
      setIncomeEntries(incomeEntries.filter((entry) => entry.id !== id));
    }
  };

  const updateIncomeEntry = (
    id: string,
    field: keyof IncomeEntry,
    value: string | number | boolean,
  ) => {
    setIncomeEntries(
      incomeEntries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const handleRemoveCard = (id: string) => {
    setCardsToInclude((prev) => prev.filter((c: CardToInclude) => c.id !== id));
  };

  const handleAddCard = (data: {
    name: string;
    lastFourDigits?: string;
    cardType: CardType;
    spendingLimit?: string;
    userId: string;
  }) => {
    const user = users.find((u) => u.id === data.userId);
    const newCard: CardToInclude = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: data.name,
      lastFourDigits: data.lastFourDigits ?? undefined,
      cardType: data.cardType,
      spendingLimit:
        data.spendingLimit && data.spendingLimit.trim() !== ""
          ? Number(data.spendingLimit)
          : undefined,
      userId: data.userId,
      user: user
        ? {
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
          }
        : undefined,
    };
    setCardsToInclude((prev) => [...prev, newCard]);
    setShowAddCardModal(false);
  };

  const onSubmit = async (data: CreateBudgetFormData) => {
    try {
      // For 50/30/20 express budgets, auto-generate one category per group
      // allocated 50/30/20 of adjusted income. The remainder goes to
      // investments so the three always sum exactly to total income.
      let categoryAllocations: Array<{
        name: string;
        group: CategoryType;
        allocatedAmount: number;
      }>;
      if (isExpress) {
        const adjustedIncome = incomeEntries.reduce(
          (sum, entry) =>
            sum +
            calculateAdjustedIncome(entry.amount, entry.frequency, data.period),
          0,
        );
        const needs = roundToCents(adjustedIncome * 0.5);
        const wants = roundToCents(adjustedIncome * 0.3);
        const investments = roundToCents(adjustedIncome - needs - wants);
        categoryAllocations = [
          { name: "Needs", group: CategoryType.NEEDS, allocatedAmount: needs },
          { name: "Wants", group: CategoryType.WANTS, allocatedAmount: wants },
          {
            name: "Investments",
            group: CategoryType.INVESTMENT,
            allocatedAmount: investments,
          },
        ];
      } else {
        // Transform selectedCategories to the format expected by the API
        categoryAllocations = selectedCategories.map((cat) => ({
          name: cat.name,
          group: cat.group,
          allocatedAmount: cat.allocatedAmount,
        }));
      }

      const incomes = incomeEntries.map((entry) => ({
        amount: entry.amount,
        source: entry.source,
        description: entry.description ?? "",
        isPlanned: entry.isPlanned,
        frequency: entry.frequency,
      }));

      const cardsPayload = cardsToInclude.map((card) => ({
        name: card.name,
        lastFourDigits: card.lastFourDigits,
        cardType: card.cardType,
        spendingLimit: card.spendingLimit,
        userId: card.userId,
      }));

      const mutation = initialBudget
        ? duplicateBudgetMutation
        : createBudgetFromScratchMutation;
      const created = await mutation.mutateAsync({
        ...data,
        categoryAllocations,
        incomes,
        cardsToInclude: cardsPayload,
      });

      if (created.failedCards.length > 0) {
        toast.error(
          `Budget created, but ${created.failedCards.length} card(s) could not be added: ${created.failedCards.join(", ")}`,
        );
      }

      if (created.incomesSkipped && created.failedCards.length > 0) {
        toast.error(
          "Income transactions were skipped because card creation/copying failed.",
        );
      }

      if (created.failedIncomes.length > 0) {
        toast.error(
          `Budget created, but ${created.failedIncomes.length} income transaction(s) could not be created: ${created.failedIncomes.join(", ")}`,
        );
      }

      resetModal();
      onSuccess?.();
      onClose();
      toast.success("Budget created successfully!");
    } catch (error) {
      console.error("Failed to create budget:", error);
      toast.error("Failed to create budget. Please try again.");
    }
  };

  const isBasicStepValid = () => {
    return (
      watchedName &&
      watchedName.trim() !== "" &&
      watchedStartAt &&
      watchedEndAt &&
      new Date(watchedEndAt) >= new Date(watchedStartAt)
    );
  };

  const isCategoriesStepValid = () => {
    // Allow users to proceed without categories
    return true;
  };

  const isAllocationStepValid = () => {
    // If no categories, allocation is always valid
    if (selectedCategories.length === 0) {
      return true;
    }

    const totalAllocated = selectedCategories.reduce(
      (sum, cat) => sum + cat.allocatedAmount,
      0,
    );

    // Calculate adjusted total income
    const adjustedTotalIncome = incomeEntries.reduce((sum, entry) => {
      const adjustedAmount = calculateAdjustedIncome(
        entry.amount,
        entry.frequency,
        watch("period"),
      );
      return sum + adjustedAmount;
    }, 0);

    return adjustedTotalIncome - totalAllocated >= 0;
  };

  const isIncomeStepValid = () => {
    return (
      incomeEntries.length > 0 &&
      incomeEntries.every(
        (entry) => entry.amount > 0 && entry.source.trim() !== "",
      )
    );
  };

  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-primary-950/40 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-full max-w-4xl animate-scale-in flex-col rounded-2xl bg-surface-card shadow-lifted sm:h-[70vh] sm:max-h-[calc(100dvh-2rem)]">
        {/* Header - Full Width */}
        <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b p-4 sm:items-center sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
              {initialBudget ? "Duplicate Budget" : "Create New Budget"}
            </h2>
            <p className="text-sm text-gray-500">
              {currentStep === "basic" && "Set up your budget basics"}
              {currentStep === "income" &&
                (isExpress
                  ? "Set up your income — we'll auto-create Needs, Wants, and Investments at 50/30/20"
                  : "Set up your income")}
              {currentStep === "cards" &&
                "Optionally review the cards that will be associated with this budget. You can always adjust cards later from the Cards page."}
              {currentStep === "categories" &&
                "Create your own spending categories (optional). You can organize them by needs, wants, or investments."}
              {currentStep === "allocation" &&
                "Allocate funds to categories (optional)"}
            </p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="-mr-1 flex-shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile step indicator (vertical sidebar is hidden below lg) */}
        <BudgetStepsSidebar
          variant="horizontal"
          className="lg:hidden"
          currentStep={currentStep}
          visibleSteps={visibleSteps}
          onStepClick={handleStepClick}
        />

        {/* Main Content Area with Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar (desktop) */}
          <BudgetStepsSidebar
            className="hidden lg:block"
            currentStep={currentStep}
            visibleSteps={visibleSteps}
            onStepClick={handleStepClick}
          />

          {/* Main Content */}
          <div className="flex flex-1 flex-col">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
                {/* Step Content */}
                {currentStep === "basic" && (
                  <BasicBudgetStep
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    errors={errors}
                    onPeriodChange={handlePeriodChange}
                    onStartDateChange={handleStartDateChange}
                  />
                )}

                {currentStep === "income" && (
                  <IncomeStep
                    incomeEntries={incomeEntries}
                    onAddIncomeEntry={addIncomeEntry}
                    onRemoveIncomeEntry={removeIncomeEntry}
                    onUpdateIncomeEntry={updateIncomeEntry}
                  />
                )}

                {currentStep === "cards" && (
                  <CardsStep
                    cardsToInclude={cardsToInclude}
                    onRemoveCard={handleRemoveCard}
                    onOpenAddCard={() => setShowAddCardModal(true)}
                    isDuplicating={!!initialBudget}
                  />
                )}

                {currentStep === "categories" && (
                  <CategoriesStep
                    selectedCategories={selectedCategories}
                    onAddCategory={handleAddCategory}
                    onRemoveCategory={handleRemoveCategory}
                  />
                )}

                {currentStep === "allocation" &&
                  (watchedStrategy === StrategyType.FIFTY_THIRTY_TWENTY ? (
                    <PercentageAllocationStep
                      selectedCategories={selectedCategories}
                      incomeEntries={incomeEntries}
                      budgetPeriod={watch("period")}
                      onAllocationChange={handleAllocationChange}
                    />
                  ) : (
                    <AllocationStep
                      selectedCategories={selectedCategories}
                      incomeEntries={incomeEntries}
                      budgetPeriod={watch("period")}
                      onAllocationChange={handleAllocationChange}
                    />
                  ))}
              </div>
            </form>
          </div>
        </div>

        {/* Navigation Buttons - Full Width */}
        <div className="flex-shrink-0 border-t bg-gray-50 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              {currentStep !== "basic" && (
                <Button type="button" variant="outline" onClick={handleBack}>
                  Back
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="hidden sm:inline-flex"
              >
                Cancel
              </Button>

              {isLastStep ? (
                <Button
                  type="submit"
                  disabled={
                    isCreating ||
                    (isExpress
                      ? !isIncomeStepValid()
                      : !isAllocationStepValid())
                  }
                  onClick={handleSubmit(onSubmit)}
                >
                  {isCreating ? "Creating..." : "Create Budget"}
                </Button>
              ) : (
                <Button
                  onClick={handleNextClick}
                  disabled={
                    (currentStep === "basic" && !isBasicStepValid()) ||
                    (currentStep === "income" && !isIncomeStepValid()) ||
                    (currentStep === "categories" && !isCategoriesStepValid())
                  }
                >
                  {currentStep === "cards" ? "Continue" : "Next"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add card modal (within create budget flow) */}
      {showAddCardModal && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowAddCardModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-full w-full max-w-md overflow-y-auto overscroll-contain"
          >
            <AddCardForm
              onSubmit={handleAddCard}
              onCancel={() => setShowAddCardModal(false)}
              isLoading={false}
              users={users}
              loadingUsers={loadingUsers}
              defaultValues={{
                userId: users.length === 1 ? users[0]?.id : undefined,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
