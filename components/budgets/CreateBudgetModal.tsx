"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { toast } from "react-hot-toast";
import { useCreateBudget } from "@/lib/data-hooks/budgets/useBudgets";
import { StrategyType, PeriodType, type CategoryType } from "@prisma/client";
import { calculateAdjustedIncome } from "@/lib/utils";

// Import components
import BudgetStepsSidebar from "./BudgetStepsSidebar";
import BasicBudgetStep from "./BasicBudgetStep";
import IncomeStep from "./IncomeStep";
import CategoriesStep from "./CategoriesStep";
import AllocationStep from "./AllocationStep";
import PercentageAllocationStep from "./PercentageAllocationStep";
import type {
  CreateBudgetFormData,
  CategoryAllocation,
  IncomeEntry,
  StepType,
} from "./types";
import Button from "../Button";

// Validation schema
const createBudgetSchema = z
  .object({
    name: z.string().min(1, "Budget name is required"),
    strategy: z.nativeEnum(StrategyType),
    period: z.nativeEnum(PeriodType),
    startAt: z.string().min(1, "Start date is required"),
    endAt: z.string().min(1, "End date is required"),
    isRecurring: z.boolean(),
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

// Utility functions for smart date calculation
const calculateEndDate = (startDate: Date, period: PeriodType): Date => {
  const date = new Date(startDate);

  switch (period) {
    case PeriodType.WEEKLY:
      // Find the end of the week (Sunday)
      const dayOfWeek = date.getDay();
      const daysToAdd = 6 - dayOfWeek;
      date.setDate(date.getDate() + daysToAdd);
      return date;

    case PeriodType.MONTHLY:
      // Find the last day of the current month
      const year = date.getFullYear();
      const month = date.getMonth();
      // Create a date for the first day of the next month, then subtract 1 day
      const firstDayNextMonth = new Date(year, month + 1, 1);
      const lastDay = new Date(firstDayNextMonth);
      lastDay.setDate(lastDay.getDate() - 1);
      return lastDay;

    case PeriodType.QUARTERLY:
      // Calculate 3 months after the start date
      const quarterlyEndDate = new Date(startDate);
      quarterlyEndDate.setMonth(quarterlyEndDate.getMonth() + 3);
      // Subtract 1 day to get the day before the 3-month mark
      quarterlyEndDate.setDate(quarterlyEndDate.getDate());
      return quarterlyEndDate;

    case PeriodType.YEARLY:
      // Find the last day of the current year
      date.setMonth(11, 31); // December 31st
      return date;

    case PeriodType.ONE_TIME:
      // For one-time, return the same date (user will manually set end date)
      return date;

    default:
      return date;
  }
};

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
}

export default function CreateBudgetModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateBudgetModalProps) {
  const createBudgetMutation = useCreateBudget();
  const [selectedCategories, setSelectedCategories] = useState<
    CategoryAllocation[]
  >([]);
  const [currentStep, setCurrentStep] = useState<StepType>("basic");
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
      isRecurring: true,
    },
  });

  const watchedName = watch("name");
  const watchedStartAt = watch("startAt");
  const watchedEndAt = watch("endAt");
  const watchedPeriod = watch("period");
  const watchedStrategy = watch("strategy");

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

    // If One Time is selected, disable recurring
    if (newPeriod === PeriodType.ONE_TIME) {
      setValue("isRecurring", false);
    }

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

  // Start with no categories selected
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
    else if (currentStep === "income") setCurrentStep("categories");
    else if (currentStep === "categories") setCurrentStep("allocation");
  };

  const handleNextClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleNext();
  };

  const handleBack = () => {
    if (currentStep === "income") setCurrentStep("basic");
    else if (currentStep === "categories") setCurrentStep("income");
    else if (currentStep === "allocation") setCurrentStep("categories");
  };

  const resetModal = () => {
    reset();
    // Reset categories to empty
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

  const onSubmit = async (data: CreateBudgetFormData) => {
    try {
      // Transform selectedCategories to the format expected by the API
      const categoryAllocations = selectedCategories.map((cat) => ({
        name: cat.name,
        group: cat.group,
        allocatedAmount: cat.allocatedAmount,
      }));

      // Convert income entries to the format expected by the API
      const incomes = incomeEntries.map((entry) => ({
        amount: entry.amount,
        source: entry.source,
        description: entry.description ?? "",
        isPlanned: entry.isPlanned,
        frequency: entry.frequency,
      }));

      await createBudgetMutation.mutateAsync({
        ...data,
        categoryAllocations,
        incomes,
      });

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
      ) &&
      isAllocationStepValid()
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 flex h-[70vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
        {/* Header - Full Width */}
        <div className="flex flex-shrink-0 items-center justify-between border-b p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Create New Budget
            </h2>
            <p className="text-sm text-gray-500">
              {currentStep === "basic" && "Set up your budget basics"}
              {currentStep === "income" && "Set up your income"}
              {currentStep === "categories" &&
                "Create your own spending categories (optional). You can organize them by needs, wants, or investments."}
              {currentStep === "allocation" &&
                "Allocate funds to categories (optional)"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Content Area with Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <BudgetStepsSidebar
            currentStep={currentStep}
            onStepClick={(step) => {
              // Only allow navigation to completed steps or current step
              const stepOrder = ["basic", "income", "categories", "allocation"];
              const currentIndex = stepOrder.indexOf(currentStep);
              const targetIndex = stepOrder.indexOf(step);
              if (targetIndex <= currentIndex) {
                setCurrentStep(step);
              }
            }}
          />

          {/* Main Content */}
          <div className="flex flex-1 flex-col">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-6">
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
                    budgetPeriod={watch("period")}
                    onAddIncomeEntry={addIncomeEntry}
                    onRemoveIncomeEntry={removeIncomeEntry}
                    onUpdateIncomeEntry={updateIncomeEntry}
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
        <div className="flex-shrink-0 border-t bg-gray-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              {currentStep !== "basic" && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex space-x-3">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>

              {currentStep === "allocation" ? (
                <Button
                  type="submit"
                  disabled={
                    createBudgetMutation.isPending || !isAllocationStepValid()
                  }
                  onClick={handleSubmit(onSubmit)}
                >
                  {createBudgetMutation.isPending
                    ? "Creating..."
                    : "Create Budget"}
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
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
