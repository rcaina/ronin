"use client";

import { useState } from "react";
import { useCategories } from "@/lib/data-hooks/categories/useCategories";
import PageHeader from "@/components/PageHeader";
import {
  Plus,
  Edit,
  Trash2,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Copy,
} from "lucide-react";

const CategoryTypeIcons = {
  WANTS: ShoppingBag,
  NEEDS: DollarSign,
  INVESTMENT: TrendingUp,
};

const CategoryTypeColors = {
  WANTS: "bg-blue-100 text-blue-800 border-blue-200",
  NEEDS: "bg-red-100 text-red-800 border-red-200",
  INVESTMENT: "bg-green-100 text-green-800 border-green-200",
};

const CategoryTypeLabels = {
  WANTS: "Wants",
  NEEDS: "Needs",
  INVESTMENT: "Investment",
};

export default function CategoriesPage() {
  const { data: categories, isLoading, error } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleAddCategory = () => {
    // TODO: Implement add category template functionality
    console.log("Add category template clicked");
  };

  const handleEditCategory = (categoryId: string) => {
    // TODO: Implement edit category template functionality
    console.log("Edit category template:", categoryId);
  };

  const handleDeleteCategory = (categoryId: string) => {
    // TODO: Implement delete category template functionality
    console.log("Delete category template:", categoryId);
  };

  const handleDuplicateCategory = (categoryId: string) => {
    // TODO: Implement duplicate category template functionality
    console.log("Duplicate category template:", categoryId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col bg-gray-50">
        <PageHeader
          title="Category Templates"
          description="Manage your reusable category templates"
          action={{
            label: "Add Template",
            onClick: handleAddCategory,
            icon: <Plus className="h-4 w-4" />,
          }}
        />
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 h-4 w-3/4 rounded bg-gray-200"></div>
                  <div className="mb-2 h-6 w-1/2 rounded bg-gray-200"></div>
                  <div className="mb-4 h-4 w-1/4 rounded bg-gray-200"></div>
                  <div className="flex justify-between">
                    <div className="h-8 w-20 rounded bg-gray-200"></div>
                    <div className="h-8 w-8 rounded bg-gray-200"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col bg-gray-50">
        <PageHeader
          title="Category Templates"
          description="Manage your reusable category templates"
          action={{
            label: "Add Template",
            onClick: handleAddCategory,
            icon: <Plus className="h-4 w-4" />,
          }}
        />
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-red-800">
                Failed to load category templates. Please try again.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <PageHeader
        title="Category Templates"
        description="Create and manage reusable category templates for your budgets"
        action={{
          label: "Add Template",
          onClick: handleAddCategory,
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Info Banner */}
          <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <ShoppingBag className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Category Templates
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  These are reusable category templates. When you create a
                  budget, you can select from these templates and set specific
                  spending limits for that budget period.
                </p>
              </div>
            </div>
          </div>

          {categories && categories.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const IconComponent = CategoryTypeIcons[category.group];
                return (
                  <div
                    key={category.id}
                    className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md"
                  >
                    {/* Category Type Badge */}
                    <div className="mb-4 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${CategoryTypeColors[category.group]}`}
                      >
                        <IconComponent className="mr-1 h-3 w-3" />
                        {CategoryTypeLabels[category.group]}
                      </span>

                      {/* Action Menu */}
                      <div className="flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => handleDuplicateCategory(category.id)}
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          title="Duplicate template"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditCategory(category.id)}
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          title="Edit template"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                          title="Delete template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Category Name */}
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                      {category.name}
                    </h3>

                    {/* Default Spending Limit */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-500">
                        Default Spending Limit
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(category.spendingLimit)}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Suggested amount for new budgets
                      </p>
                    </div>

                    {/* Template Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>
                        Created{" "}
                        {new Date(category.createdAt).toLocaleDateString()}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">
                        Template
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto max-w-md">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <ShoppingBag className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  No category templates yet
                </h3>
                <p className="mb-6 text-gray-500">
                  Create reusable category templates that you can use across
                  multiple budgets. Templates help you maintain consistency in
                  your financial planning.
                </p>
                <button
                  onClick={handleAddCategory}
                  className="inline-flex items-center rounded-lg bg-secondary px-4 py-2 text-black/90 shadow-sm transition-colors hover:bg-yellow-300"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first template
                </button>
              </div>
            </div>
          )}

          {/* Category Type Summary */}
          {categories && categories.length > 0 && (
            <div className="mt-12">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">
                Template Summary
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {Object.entries(CategoryTypeLabels).map(([type, label]) => {
                  const IconComponent =
                    CategoryTypeIcons[type as keyof typeof CategoryTypeIcons];
                  const count = categories.filter(
                    (cat) => cat.group === type,
                  ).length;
                  const avgLimit =
                    categories
                      .filter((cat) => cat.group === type)
                      .reduce((sum, cat) => sum + cat.spendingLimit, 0) /
                      count || 0;

                  return (
                    <div
                      key={type}
                      className={`rounded-lg border p-4 ${CategoryTypeColors[type as keyof typeof CategoryTypeColors].replace("bg-", "bg-").replace("border-", "border-")}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <IconComponent className="mr-2 h-5 w-5" />
                          <span className="font-medium">{label}</span>
                        </div>
                        <span className="text-sm font-semibold">{count}</span>
                      </div>
                      <p className="mt-2 text-sm font-bold">
                        {formatCurrency(avgLimit)} avg
                      </p>
                      <p className="text-xs text-gray-600">
                        Average default limit
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
