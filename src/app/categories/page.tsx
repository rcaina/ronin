"use client";

import { useState } from "react";
import {
  useCategories,
  useDeleteCategory,
  useCreateCategory,
  useUpdateCategory,
} from "@/lib/data-hooks/categories/useCategories";
import PageHeader from "@/components/PageHeader";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import AddCategoryForm from "@/components/categories/AddCategoryForm";
import AddItemButton from "@/components/AddItemButton";
import Button from "@/components/Button";
import {
  Plus,
  Edit,
  Trash2,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Copy,
  Info,
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { CategoryType } from "@prisma/client";

const CategoryTypeIcons = {
  [CategoryType.WANTS]: ShoppingBag,
  [CategoryType.NEEDS]: DollarSign,
  [CategoryType.INVESTMENT]: TrendingUp,
};

const CategoryTypeColors = {
  [CategoryType.WANTS]: "bg-blue-100 text-blue-800 border-blue-200",
  [CategoryType.NEEDS]: "bg-red-100 text-red-800 border-red-200",
  [CategoryType.INVESTMENT]: "bg-green-100 text-green-800 border-green-200",
};

const CategoryTypeLabels = {
  [CategoryType.WANTS]: "Wants",
  [CategoryType.NEEDS]: "Needs",
  [CategoryType.INVESTMENT]: "Investment",
};

interface CategoryFormData {
  name: string;
  spendingLimit: string;
  group: CategoryType;
}

export default function CategoriesPage() {
  const { data: categories, isLoading, error } = useCategories();
  const deleteCategoryMutation = useDeleteCategory();
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [activeColumn, setActiveColumn] = useState<
    "wants" | "needs" | "investment" | null
  >(null);
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
    spendingLimit: number;
    group: CategoryType;
  } | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    spendingLimit: "",
    group: CategoryType.WANTS,
  });

  const handleAddCategory = (column: "wants" | "needs" | "investment") => {
    setIsAddingCategory(true);
    setActiveColumn(column);
    setFormData({
      name: "",
      spendingLimit: "",
      group:
        column === "wants"
          ? CategoryType.WANTS
          : column === "needs"
            ? CategoryType.NEEDS
            : CategoryType.INVESTMENT,
    });
  };

  const handleCancelAdd = () => {
    setIsAddingCategory(false);
    setActiveColumn(null);
    setFormData({
      name: "",
      spendingLimit: "",
      group: CategoryType.WANTS,
    });
  };

  const handleFormChange = (field: keyof CategoryFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmitCategory = async () => {
    try {
      const spendingLimit = parseFloat(formData.spendingLimit);
      if (isNaN(spendingLimit) || spendingLimit < 0) {
        throw new Error("Please enter a valid spending limit");
      }

      await createCategoryMutation.mutateAsync({
        name: formData.name.trim(),
        spendingLimit,
        group: formData.group,
      });

      handleCancelAdd();
    } catch (err) {
      // Error is handled by the mutation
      console.error("Failed to create category:", err);
    }
  };

  const handleEditCategory = (category: {
    id: string;
    name: string;
    spendingLimit: number;
    group: CategoryType;
  }) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      spendingLimit: category.spendingLimit.toString(),
      group: category.group,
    });
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      spendingLimit: "",
      group: CategoryType.WANTS,
    });
  };

  const handleSubmitEdit = async () => {
    if (!editingCategory) return;

    try {
      const spendingLimit = parseFloat(formData.spendingLimit);
      if (isNaN(spendingLimit) || spendingLimit < 0) {
        throw new Error("Please enter a valid spending limit");
      }

      await updateCategoryMutation.mutateAsync({
        id: editingCategory.id,
        data: {
          name: formData.name.trim(),
          spendingLimit,
          group: formData.group,
        },
      });

      handleCancelEdit();
    } catch (err) {
      // Error is handled by the mutation
      console.error("Failed to update category:", err);
    }
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    setCategoryToDelete({ id: categoryId, name: categoryName });
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      await deleteCategoryMutation.mutateAsync(categoryToDelete.id);
      setCategoryToDelete(null);
    } catch (err) {
      // Error is handled by the mutation
      console.error("Failed to delete category:", err);
    }
  };

  const handleCancelDelete = () => {
    setCategoryToDelete(null);
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
    return <LoadingSpinner message="Loading categories..." />;
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col bg-gray-50">
        <PageHeader
          title="Category Templates"
          description="Manage your reusable category templates"
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
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Info Banner */}
          <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-xs font-medium text-blue-800">
                  Category Templates
                </h3>
                <p className="mt-1 text-xs text-blue-700">
                  These are reusable category templates. When you create a
                  budget, you can select from these templates and set specific
                  spending limits for that budget period.
                </p>
              </div>
            </div>
          </div>

          {/* Category Type Summary */}
          {categories &&
            (categories.wants.length > 0 ||
              categories.needs.length > 0 ||
              categories.investment.length > 0) && (
              <div className="mb-8">
                <h2 className="mb-6 text-xl font-semibold text-gray-900">
                  Template Summary
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {Object.entries(CategoryTypeLabels).map(([type, label]) => {
                    const IconComponent =
                      CategoryTypeIcons[type as keyof typeof CategoryTypeIcons];
                    const categoryArray =
                      categories[type.toLowerCase() as keyof typeof categories];
                    const count = categoryArray.length;
                    const avgLimit =
                      count > 0
                        ? categoryArray.reduce(
                            (sum, cat) => sum + cat.spendingLimit,
                            0,
                          ) / count
                        : 0;

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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Column 1: Wants */}
            <div className="space-y-6">
              <h3 className="flex items-center text-lg font-medium text-gray-900">
                <ShoppingBag className="mr-2 h-5 w-5 text-blue-500" />
                Wants
              </h3>

              {/* Add Template Button for Wants */}
              {!isAddingCategory && (
                <AddItemButton
                  onClick={() => handleAddCategory("wants")}
                  title="Add Template"
                  variant="compact"
                />
              )}

              {/* Inline Add Form for Wants */}
              {isAddingCategory && activeColumn === "wants" && (
                <AddCategoryForm
                  formData={formData}
                  onFormChange={handleFormChange}
                  onSubmit={handleSubmitCategory}
                  onCancel={handleCancelAdd}
                  isLoading={createCategoryMutation.isPending}
                />
              )}

              {/* Wants Categories */}
              {categories?.wants.map((category) => {
                const IconComponent = CategoryTypeIcons[category.group];
                const isEditing = editingCategory?.id === category.id;

                if (isEditing) {
                  return (
                    <AddCategoryForm
                      key={category.id}
                      formData={formData}
                      onFormChange={handleFormChange}
                      onSubmit={handleSubmitEdit}
                      onCancel={handleCancelEdit}
                      isLoading={updateCategoryMutation.isPending}
                      isEditing={true}
                    />
                  );
                }

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
                          onClick={() => handleEditCategory(category)}
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          title="Edit template"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteCategory(category.id, category.name)
                          }
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

            {/* Column 2: Needs */}
            <div className="space-y-6">
              <h3 className="flex items-center text-lg font-medium text-gray-900">
                <DollarSign className="mr-2 h-5 w-5 text-red-500" />
                Needs
              </h3>

              {/* Add Template Button for Needs */}
              {!isAddingCategory && (
                <AddItemButton
                  onClick={() => handleAddCategory("needs")}
                  title="Add Template"
                  variant="compact"
                />
              )}

              {/* Inline Add Form for Needs */}
              {isAddingCategory && activeColumn === "needs" && (
                <AddCategoryForm
                  formData={formData}
                  onFormChange={handleFormChange}
                  onSubmit={handleSubmitCategory}
                  onCancel={handleCancelAdd}
                  isLoading={createCategoryMutation.isPending}
                />
              )}

              {/* Needs Categories */}
              {categories?.needs.map((category) => {
                const IconComponent = CategoryTypeIcons[category.group];
                const isEditing = editingCategory?.id === category.id;

                if (isEditing) {
                  return (
                    <AddCategoryForm
                      key={category.id}
                      formData={formData}
                      onFormChange={handleFormChange}
                      onSubmit={handleSubmitEdit}
                      onCancel={handleCancelEdit}
                      isLoading={updateCategoryMutation.isPending}
                      isEditing={true}
                    />
                  );
                }

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
                          onClick={() => handleEditCategory(category)}
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          title="Edit template"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteCategory(category.id, category.name)
                          }
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

            {/* Column 3: Investment */}
            <div className="space-y-6">
              <h3 className="flex items-center text-lg font-medium text-gray-900">
                <TrendingUp className="mr-2 h-5 w-5 text-green-500" />
                Investment
              </h3>

              {/* Add Template Button for Investment */}
              {!isAddingCategory && (
                <AddItemButton
                  onClick={() => handleAddCategory("investment")}
                  title="Add Template"
                  variant="compact"
                />
              )}

              {/* Inline Add Form for Investment */}
              {isAddingCategory && activeColumn === "investment" && (
                <AddCategoryForm
                  formData={formData}
                  onFormChange={handleFormChange}
                  onSubmit={handleSubmitCategory}
                  onCancel={handleCancelAdd}
                  isLoading={createCategoryMutation.isPending}
                />
              )}

              {/* Investment Categories */}
              {categories?.investment.map((category) => {
                const IconComponent = CategoryTypeIcons[category.group];
                const isEditing = editingCategory?.id === category.id;

                if (isEditing) {
                  return (
                    <AddCategoryForm
                      key={category.id}
                      formData={formData}
                      onFormChange={handleFormChange}
                      onSubmit={handleSubmitEdit}
                      onCancel={handleCancelEdit}
                      isLoading={updateCategoryMutation.isPending}
                      isEditing={true}
                    />
                  );
                }

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
                          onClick={() => handleEditCategory(category)}
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          title="Edit template"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteCategory(category.id, category.name)
                          }
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
          </div>

          {/* Empty State - only show if no categories and not adding */}
          {(!categories ||
            (categories.wants.length === 0 &&
              categories.needs.length === 0 &&
              categories.investment.length === 0)) &&
            !isAddingCategory && (
              <div className="col-span-full text-center">
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
                  <Button
                    onClick={() => handleAddCategory("wants")}
                    variant="secondary"
                    size="md"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first template
                  </Button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!categoryToDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Category Template"
        message={`Are you sure you want to delete "${categoryToDelete?.name ?? ""}"? This action cannot be undone.`}
        itemName={categoryToDelete?.name ?? ""}
        isLoading={deleteCategoryMutation.isPending}
        confirmText="Delete Template"
      />
    </div>
  );
}
