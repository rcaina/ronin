"use client";

import PageHeader from "@/components/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import CategoryGridView from "@/components/categories/CategoryGridView";
import CategoryViewToggle, {
  type CategoryViewType,
} from "@/components/categories/CategoryViewToggle";
import CategoryListView from "@/components/categories/CategoryListView";
import MergeCategoriesModal from "@/components/categories/MergeCategoriesModal";
import MergeSelectionBar from "@/components/MergeSelectionBar";
import { CategoryType } from "@prisma/client";
import {
  useCategories,
  useCreateCategory,
  useMergeCategories,
} from "@/lib/data-hooks/categories/useCategories";
import { usePageLoading } from "@/components/ConditionalLayout";
import { Merge, Plus, AlertCircle, Search, X } from "lucide-react";
import AddCategoryForm from "@/components/categories/AddCategoryForm";
import {
  useDebounce,
  useLocalStorageState,
  useLockBodyScroll,
} from "@/lib/utils/hooks";

const CATEGORIES_VIEW_STORAGE_KEY = "ronin.categoriesView";
const isCategoryViewType = (value: unknown): value is CategoryViewType =>
  value === "grid" || value === "list";

const CategoriesPage = () => {
  const [view, setView] = useLocalStorageState<CategoryViewType>(
    CATEGORIES_VIEW_STORAGE_KEY,
    "grid",
    isCategoryViewType,
  );
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  useLockBodyScroll(showAddModal);
  const { data: categories, isLoading, error } = useCategories();
  const createCategoryMutation = useCreateCategory();
  const mergeCategoriesMutation = useMergeCategories();

  // "Merge categories" selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);

  // Debounce the search to avoid too many updates
  const debouncedSearch = useDebounce(localSearchQuery, 300);

  // Filter categories based on search query
  const filteredCategories = useMemo(
    () =>
      categories
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
        : undefined,
    [categories, debouncedSearch],
  );

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

  const allCategories = useMemo(
    () =>
      categories
        ? [...categories.needs, ...categories.wants, ...categories.investment]
        : [],
    [categories],
  );

  const selectedCategories = useMemo(
    () => allCategories.filter((category) => selectedIds.has(category.id)),
    [allCategories, selectedIds],
  );

  const handleToggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Prune selections that fall out of the filtered set (e.g. the user
  // searches while in selection mode and a previously-selected category is
  // no longer visible) so the merge count never includes hidden items.
  useEffect(() => {
    if (!selectionMode || !filteredCategories) return;
    const visibleIds = new Set([
      ...filteredCategories.needs.map((category) => category.id),
      ...filteredCategories.wants.map((category) => category.id),
      ...filteredCategories.investment.map((category) => category.id),
    ]);
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [debouncedSearch, selectionMode, filteredCategories]);

  const handleOpenMergeModal = () => {
    setMergeTargetId(null);
    setShowMergeModal(true);
  };

  const handleCloseMergeModal = () => {
    setShowMergeModal(false);
    setMergeTargetId(null);
  };

  const handleConfirmMerge = async (targetId: string) => {
    const sourceIds = selectedCategories
      .filter((category) => category.id !== targetId)
      .map((category) => category.id);

    try {
      await mergeCategoriesMutation.mutateAsync({
        sourceIds,
        targetId,
      });
      toast.success(`Merged ${sourceIds.length + 1} categories successfully!`);
      handleCloseMergeModal();
      setSelectionMode(false);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to merge categories:", error);
      toast.error("Failed to merge categories. Please try again.");
    }
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
  usePageLoading(isLoading, "Loading categories...");
  if (isLoading) {
    return null;
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
      <div className="flex flex-col bg-surface lg:h-screen">
        <PageHeader
          title="Categories"
          description="Manage your template categories"
          action={
            selectionMode
              ? undefined
              : {
                  label: "Add category",
                  onClick: handleAddCategoryClick,
                  icon: <Plus className="h-4 w-4" />,
                }
          }
          actions={[
            {
              label: selectionMode ? "Cancel merge" : "Merge",
              onClick: handleToggleSelectionMode,
              icon: selectionMode ? (
                <X className="h-4 w-4" />
              ) : (
                <Merge className="h-4 w-4" />
              ),
              variant: selectionMode ? "outline" : "secondary",
            },
          ]}
        />

        <div className="pt-4 lg:flex-1 lg:overflow-hidden lg:pt-0">
          <div className="lg:h-full lg:overflow-y-auto">
            <div
              className={`mx-auto w-full px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-4 ${
                selectionMode
                  ? "pb-40 sm:pb-40 lg:pb-24"
                  : "pb-28 sm:pb-28 lg:pb-8"
              }`}
            >
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
                        className="w-full rounded-xl border border-gray-300 bg-surface-card py-2 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-500 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
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
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                />
              ) : (
                <CategoryListView
                  getGroupColor={getGroupColor}
                  getGroupLabel={getGroupLabel}
                  categories={filteredCategories}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                />
              )}
            </div>

            {/* Merge selection action bar — sticks to the bottom of the
                scrollable content, offset above the mobile bottom tab bar
                (~56px + safe area) so it never sits underneath it. */}
            {selectionMode && (
              <MergeSelectionBar
                selectedCount={selectedIds.size}
                itemNoun="categories"
                onMerge={handleOpenMergeModal}
              />
            )}
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-primary-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md animate-scale-in overflow-y-auto overscroll-contain rounded-2xl bg-surface-card p-6 shadow-lifted">
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

      {/* Merge Categories Modal */}
      <MergeCategoriesModal
        isOpen={showMergeModal}
        onClose={handleCloseMergeModal}
        categories={selectedCategories}
        targetId={mergeTargetId}
        onSelectTarget={setMergeTargetId}
        onConfirm={handleConfirmMerge}
        isLoading={mergeCategoriesMutation.isPending}
        getGroupColor={getGroupColor}
        getGroupLabel={getGroupLabel}
      />
    </>
  );
};

export default CategoriesPage;
