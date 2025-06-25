"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X,
  Plus,
  DollarSign,
  Target,
  TrendingUp,
  ShoppingBag,
  Check,
} from "lucide-react";
import { useCategories } from "@/lib/data-hooks/categories/useCategories";
import { useCreateBudget } from "@/lib/data-hooks/budgets/useBudgets";
import { CategoryType, PeriodType, StrategyType } from "@prisma/client";
import type { Category } from "@prisma/client";

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
      const startDate = new Date(data.startAt);
      const endDate = new Date(data.endAt);
      return endDate > startDate;
    },
    {
      message: "End date must be after start date",
      path: ["endAt"],
    },
  );

type CreateBudgetFormData = z.infer<typeof createBudgetSchema>;

interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface CategoryAllocation {
  categoryId: string;
  name: string;
  group: CategoryType;
  allocatedAmount: number;
  isSelected: boolean;
}

interface IncomeEntry {
  id: string;
  amount: number;
  source: string;
  description: string;
  isPlanned: boolean;
  frequency: PeriodType;
}

export default function CreateBudgetModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateBudgetModalProps) {
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const createBudgetMutation = useCreateBudget();
  const [selectedCategories, setSelectedCategories] = useState<
    CategoryAllocation[]
  >([]);
  const [currentStep, setCurrentStep] = useState<
    "basic" | "income" | "categories" | "allocation"
  >("basic");
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
    formState: { errors },
    reset,
  } = useForm<CreateBudgetFormData>({
    resolver: zodResolver(createBudgetSchema),
    defaultValues: {
      name: "",
      strategy: StrategyType.ZERO_SUM,
      period: PeriodType.MONTHLY,
      startAt: new Date().toISOString().split("T")[0],
      endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    },
  });

  const watchedName = watch("name");
  const watchedStartAt = watch("startAt");
  const watchedEndAt = watch("endAt");

  // Initialize categories when data loads
  useEffect(() => {
    if (categories && Object.values(categories).flat().length > 0) {
      const allCategories = Object.values(categories).flat() as Category[];
      const categoryAllocations: CategoryAllocation[] = allCategories.map(
        (category) => ({
          categoryId: category.id,
          name: category.name,
          group: category.group,
          allocatedAmount: 0,
          isSelected: true, // Default to selected
        }),
      );
      setSelectedCategories(categoryAllocations);
    }
  }, [categories]);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.map((cat) =>
        cat.categoryId === categoryId
          ? { ...cat, isSelected: !cat.isSelected }
          : cat,
      ),
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

  const totalIncome = incomeEntries.reduce(
    (sum, entry) => sum + entry.amount,
    0,
  );

  // Helper function to get step index
  const getStepIndex = (step: string) => {
    const steps = ["basic", "income", "categories", "allocation"];
    return steps.indexOf(step);
  };

  const onSubmit = async (data: CreateBudgetFormData) => {
    try {
      const categoryAllocations: Record<string, number> = {};
      selectedCategories
        .filter((cat) => cat.isSelected)
        .forEach((cat) => {
          categoryAllocations[cat.categoryId] = cat.allocatedAmount;
        });

      // Convert income entries to the format expected by the API
      const incomes = incomeEntries.map((entry) => ({
        amount: entry.amount,
        source: entry.source,
        description: entry.description || undefined,
        isPlanned: entry.isPlanned,
        frequency: entry.frequency,
      }));

      await createBudgetMutation.mutateAsync({
        ...data,
        categoryAllocations,
        incomes,
      });

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
      setCurrentStep("basic");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to create budget:", error);
    }
  };

  const getCategoryGroupColor = (group: CategoryType) => {
    switch (group) {
      case CategoryType.NEEDS:
        return "bg-red-100 text-red-800 border-red-200";
      case CategoryType.WANTS:
        return "bg-blue-100 text-blue-800 border-blue-200";
      case CategoryType.INVESTMENT:
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCategoryGroupIcon = (group: CategoryType) => {
    switch (group) {
      case CategoryType.NEEDS:
        return <DollarSign className="h-4 w-4" />;
      case CategoryType.WANTS:
        return <ShoppingBag className="h-4 w-4" />;
      case CategoryType.INVESTMENT:
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const totalAllocated = selectedCategories
    .filter((cat) => cat.isSelected)
    .reduce((sum, cat) => sum + cat.allocatedAmount, 0);

  const allocationRemaining = totalIncome - totalAllocated;

  const isBasicStepValid = () => {
    return (
      watchedName &&
      watchedName.trim() !== "" &&
      watchedStartAt &&
      watchedEndAt &&
      new Date(watchedEndAt) > new Date(watchedStartAt)
    );
  };

  const isCategoriesStepValid = () => {
    return selectedCategories.filter((c) => c.isSelected).length > 0;
  };

  const isAllocationStepValid = () => {
    return allocationRemaining >= 0;
  };

  const isIncomeStepValid = () => {
    return (
      incomeEntries.length > 0 &&
      incomeEntries.every(
        (entry) => entry.amount > 0 && entry.source.trim() !== "",
      ) &&
      allocationRemaining >= 0
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 flex h-[70vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Create New Budget
            </h2>
            <p className="text-sm text-gray-500">
              {currentStep === "basic" && "Set up your budget basics"}
              {currentStep === "income" && "Set up your income"}
              {currentStep === "categories" && "Select spending categories"}
              {currentStep === "allocation" && "Allocate funds to categories"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex-shrink-0 border-b bg-gray-50 px-6 py-6">
          <div className="relative">
            {/* Progress Line Background */}
            <div className="absolute left-0 right-0 top-5 h-1 rounded-full bg-gray-200" />

            {/* Steps Container */}
            <div className="relative flex justify-between">
              {[
                { step: "basic", label: "Basic" },
                { step: "income", label: "Income" },
                { step: "categories", label: "Categories" },
                { step: "allocation", label: "Allocation" },
              ].map(({ step, label }, index) => (
                <div key={step} className="flex flex-col items-center">
                  {/* Step Circle */}
                  <div
                    className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                      currentStep === step
                        ? "bg-secondary text-gray-900"
                        : index < getStepIndex(currentStep)
                          ? "bg-black/90 text-white"
                          : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {index < getStepIndex(currentStep) ? (
                      <Check className="h-5 w-5 text-secondary" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Step Label */}
                  <span className="mt-2 text-xs font-medium text-gray-600">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress Line Overlay */}
            <div
              className="absolute left-0 top-5 h-1 rounded-full bg-black/90 transition-all duration-300"
              style={{
                width: `${Math.max(0, getStepIndex(currentStep)) * 33.33}%`,
              }}
            />
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-6">
            {/* Step 1: Basic Budget Info */}
            {currentStep === "basic" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Budget Name
                  </label>
                  <input
                    type="text"
                    {...register("name")}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                    placeholder="e.g., Monthly Budget 2024"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Budget Strategy
                    </label>
                    <select
                      {...register("strategy")}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                    >
                      <option value={StrategyType.ZERO_SUM}>
                        Zero Sum Budget
                      </option>
                      <option value={StrategyType.PERCENTAGE}>
                        Percentage Based
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Budget Period
                    </label>
                    <select
                      {...register("period")}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                    >
                      <option value={PeriodType.WEEKLY}>Weekly</option>
                      <option value={PeriodType.MONTHLY}>Monthly</option>
                      <option value={PeriodType.QUARTERLY}>Quarterly</option>
                      <option value={PeriodType.YEARLY}>Yearly</option>
                      <option value={PeriodType.ONE_TIME}>One Time</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      {...register("startAt")}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                    />
                    {errors.startAt && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.startAt.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      {...register("endAt")}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                    />
                    {errors.endAt && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.endAt.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Income Setup */}
            {currentStep === "income" && (
              <div className="space-y-6">
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-sm text-green-700">
                    Set up your income sources for this budget period. You can
                    add multiple income sources.
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={addIncomeEntry}
                    className="w-full rounded-lg border-2 border-dashed border-gray-300 p-4 text-center text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-700"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Plus className="h-5 w-5" />
                      <span>Add Another Income Source</span>
                    </div>
                  </button>

                  {incomeEntries.map((entry, index) => (
                    <div key={entry.id} className="rounded-lg border p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">
                          Income Source {index + 1}
                        </h3>
                        {incomeEntries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeIncomeEntry(entry.id)}
                            className="rounded p-1 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Income Amount
                          </label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-2 text-gray-500">
                              $
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={entry.amount}
                              onChange={(e) =>
                                updateIncomeEntry(
                                  entry.id,
                                  "amount",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="block w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Income Source
                          </label>
                          <input
                            type="text"
                            value={entry.source}
                            onChange={(e) =>
                              updateIncomeEntry(
                                entry.id,
                                "source",
                                e.target.value,
                              )
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                            placeholder="e.g., Salary, Freelance"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Description (Optional)
                        </label>
                        <textarea
                          value={entry.description}
                          onChange={(e) =>
                            updateIncomeEntry(
                              entry.id,
                              "description",
                              e.target.value,
                            )
                          }
                          rows={2}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                          placeholder="Additional details about this income..."
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Income Frequency
                          </label>
                          <select
                            value={entry.frequency}
                            onChange={(e) =>
                              updateIncomeEntry(
                                entry.id,
                                "frequency",
                                e.target.value as PeriodType,
                              )
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                          >
                            <option value={PeriodType.WEEKLY}>Weekly</option>
                            <option value={PeriodType.MONTHLY}>Monthly</option>
                            <option value={PeriodType.QUARTERLY}>
                              Quarterly
                            </option>
                            <option value={PeriodType.YEARLY}>Yearly</option>
                            <option value={PeriodType.ONE_TIME}>
                              One Time
                            </option>
                          </select>
                        </div>

                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={entry.isPlanned}
                            onChange={(e) =>
                              updateIncomeEntry(
                                entry.id,
                                "isPlanned",
                                e.target.checked,
                              )
                            }
                            className="h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                          />
                          <label className="text-sm font-medium text-gray-700">
                            This is planned income
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {totalIncome > 0 && (
                  <div className="rounded-lg bg-blue-50 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-blue-700">
                        Total Income:
                      </span>
                      <span className="font-semibold text-blue-900">
                        ${totalIncome.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-blue-600">Income Sources:</span>
                      <span className="font-semibold text-blue-800">
                        {incomeEntries.length}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Category Selection */}
            {currentStep === "categories" && (
              <div className="space-y-6">
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-700">
                    Select the spending categories you want to track in this
                    budget. You can adjust allocations in the next step.
                  </p>
                </div>

                {categoriesLoading ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-secondary"></div>
                    <p className="mt-2 text-sm text-gray-500">
                      Loading categories...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(categories ?? {}).map(
                      ([group, groupCategories]) => (
                        <div key={group}>
                          <h3 className="mb-3 text-lg font-semibold capitalize text-gray-900">
                            {group.toLowerCase()}
                          </h3>
                          <div className="grid gap-3">
                            {(groupCategories as Category[]).map((category) => (
                              <div
                                key={category.id}
                                className="flex cursor-pointer items-center justify-between rounded-lg border-2 p-4 transition-colors hover:bg-gray-50"
                                onClick={() =>
                                  handleCategoryToggle(category.id)
                                }
                              >
                                <div className="flex items-center space-x-3">
                                  <input
                                    type="checkbox"
                                    checked={
                                      selectedCategories.find(
                                        (c) => c.categoryId === category.id,
                                      )?.isSelected ?? false
                                    }
                                    onChange={() =>
                                      handleCategoryToggle(category.id)
                                    }
                                    className="h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                                  />
                                  <div className="flex items-center space-x-2">
                                    {getCategoryGroupIcon(category.group)}
                                    <span className="font-medium text-gray-900">
                                      {category.name}
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={`rounded-full border px-2 py-1 text-xs font-medium ${getCategoryGroupColor(
                                    category.group,
                                  )}`}
                                >
                                  {category.group}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  Selected{" "}
                  {selectedCategories.filter((c) => c.isSelected).length} of{" "}
                  {selectedCategories.length} categories
                </div>
              </div>
            )}

            {/* Step 4: Category Allocation */}
            {currentStep === "allocation" && (
              <div className="space-y-6">
                <div className="rounded-lg bg-yellow-50 p-4">
                  <p className="text-sm text-yellow-700">
                    Set spending limits for each selected category. The total
                    should match your income of ${totalIncome.toLocaleString()}.
                  </p>
                </div>

                <div className="space-y-4">
                  {selectedCategories
                    .filter((cat) => cat.isSelected)
                    .map((category) => (
                      <div
                        key={category.categoryId}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center space-x-3">
                          {getCategoryGroupIcon(category.group)}
                          <div>
                            <div className="font-medium text-gray-900">
                              {category.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {category.group}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={category.allocatedAmount}
                            onChange={(e) =>
                              handleAllocationChange(
                                category.categoryId,
                                parseFloat(e.target.value) ?? 0,
                              )
                            }
                            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right text-sm focus:border-secondary focus:outline-none focus:ring-secondary"
                          />
                        </div>
                      </div>
                    ))}
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      Total Allocated:
                    </span>
                    <span className="font-semibold text-gray-900">
                      ${totalAllocated.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Remaining:</span>
                    <span
                      className={`font-semibold ${
                        allocationRemaining >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      ${allocationRemaining.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
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
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>

                {currentStep === "allocation" ? (
                  <button
                    type="submit"
                    disabled={
                      createBudgetMutation.isPending || !isAllocationStepValid()
                    }
                    className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {createBudgetMutation.isPending
                      ? "Creating..."
                      : "Create Budget"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextClick}
                    disabled={
                      (currentStep === "basic" && !isBasicStepValid()) ||
                      (currentStep === "income" && !isIncomeStepValid()) ||
                      (currentStep === "categories" && !isCategoriesStepValid())
                    }
                    className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
