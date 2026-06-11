"use client";

import PageHeader from "@/components/PageHeader";
import { useState } from "react";
import CategoryGridView from "@/components/categories/CategoryGridView";
import CategoryViewToggle, {
  type CategoryViewType,
} from "@/components/categories/CategoryViewToggle";
import CategoryListView from "@/components/categories/CategoryListView";
import { CategoryType } from "@prisma/client";
import {
  useCategories,
  useCreateCategory,
} from "@/lib/data-hooks/categories/useCategories";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Plus, AlertCircle, Search, X } from "lucide-react";
import AddCategoryForm from "@/components/categories/AddCategoryForm";
import { useDebounce } from "@/lib/utils/hooks";

const CategoriesPage = () => {
  const [view, setView] = useState<CategoryViewType>("grid");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const { data: categories, isLoading, error } = useCategories();
  const createCategoryMutation = useCreateCategory();

  // Debounce the search to avoid too many updates
  const debouncedSearch = useDebounce(localSearchQuery, 300);

  // Filter categories based on search query
  const filteredCategories = categories
    ? {
        needs: (categories.needs || []).filter((cat) =>
          cat.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
        ),
        wants: (categories.wants || []).filter((cat) =>
          cat.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
        ),
        investment: (categories.investment || []).filter((cat) =>
          cat.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
        ),
      }
    : undefined;

  // Aligned with GROUP_COLORS from components/recharts/theme.tsx
  const getGroupColor = (group: CategoryType) => {
    switch (group) {
      case CategoryType.NEEDS:
        return "bg-[#5b7a9d]";
      case CategoryType.WANTS:
        return "bg-[#b9a15e]";
      case CategoryType.INVESTMENT:
        return "bg-[#6c9a8b]";
      default:
        return "bg-gray-400";
    }
  };

  const getGroupLabel = (group: CategoryType) => {
    switch (group) {
      case CategoryType.NEEDS:
        return "Needs";
      case CategoryType.WANTS:
        return "Wants";
      case CategoryType.INVESTMENT:
        return "Investment";
      default:
        return group;
    }
  };

  const clearSearch = () => {
    setLocalSearchQuery("");
  };

  const handleAddCategoryClick = () => {
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
  };

  const handleSubmitAddCategory = async (data: {
    name: string;
    group: CategoryType;
  }) => {
    try {
      await createCategoryMutation.mutateAsync({
        name: data.name,
        group: data.group,
      });

      handleCloseAddModal();
    } catch (error) {
      console.error("Failed to add category:", error);
    }
  };

  // Show loading state
  if (isLoading) {
    return <LoadingSpinner message="Loading categories..." />;
  }

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mb-4 text-red-500">
            <AlertCircle className="mx-auto h-12 w-12" />
          </div>
          <div className="mb-2 text-lg text-red-600">
            Error loading categories
          </div>
          <div className="text-sm text-gray-500">
            {error && "message" in error
              ? error.message
              : "An unexpected error occurred"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen flex-col bg-surface">
        <PageHeader
          title="Categories"
          description="Manage your template categories"
          action={{
            label: "Add category",
            onClick: handleAddCategoryClick,
            icon: <Plus className="h-4 w-4" />,
          }}
        />

        <div className="flex-1 overflow-hidden pt-4 lg:pt-0">
          <div className="h-full overflow-y-auto">
            <div className="mx-auto w-full px-2 py-4 pb-28 sm:px-4 sm:py-6 sm:pb-28 lg:px-8 lg:py-4 lg:pb-8">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="relative w-full">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search categories..."
                        value={localSearchQuery}
                        onChange={(e) => setLocalSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-500 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                      />
                      {localSearchQuery && (
                        <button
                          onClick={clearSearch}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition-colors duration-200 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4">
                  <CategoryViewToggle view={view} onViewChange={setView} />
                </div>
              </div>

              {view === "grid" ? (
                <CategoryGridView
                  getGroupColor={getGroupColor}
                  getGroupLabel={getGroupLabel}
                  categories={filteredCategories}
                />
              ) : (
                <CategoryListView
                  getGroupColor={getGroupColor}
                  getGroupLabel={getGroupLabel}
                  categories={filteredCategories}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md animate-scale-in rounded-2xl bg-white p-6 shadow-lifted">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                Add category
              </h2>
              <button
                onClick={handleCloseAddModal}
                className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <AddCategoryForm
              onSubmit={handleSubmitAddCategory}
              onCancel={handleCloseAddModal}
              isLoading={createCategoryMutation.isPending}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default CategoriesPage;
