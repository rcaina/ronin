"use client";

import { useState, useRef, useEffect } from "react";
import type { CategoryType } from "@prisma/client";
import { Edit, Trash2, Copy, GripVertical } from "lucide-react";
import AddCategoryForm from "@/components/categories/AddCategoryForm";
import AddItemButton from "@/components/AddItemButton";

interface Category {
  id: string;
  name: string;
  group: CategoryType;
  createdAt: string;
  updatedAt: string;
}

interface CategoryColumnProps {
  type: CategoryType;
  categories: Category[];
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  label: string;
  onAddCategory: (data: { name: string; group: CategoryType }) => Promise<void>;
  onEditCategory: (data: {
    name: string;
    group: CategoryType;
  }) => Promise<void>;
  onDeleteCategory: (categoryId: string, categoryName: string) => void;
  onDuplicateCategory: (categoryId: string) => Promise<void>;
  onMoveCategory: (categoryId: string, newGroup: CategoryType) => Promise<void>;
  isAddingCategory: boolean;
  activeColumn: "wants" | "needs" | "investment" | null;
  onStartAdd: (column: "wants" | "needs" | "investment") => void;
  onCancelAdd: () => void;
  editingCategory: { id: string; name: string; group: CategoryType } | null;
  onStartEdit: (category: {
    id: string;
    name: string;
    group: CategoryType;
  }) => void;
  onCancelEdit: () => void;
  isCreateLoading: boolean;
  isUpdateLoading: boolean;
}

export default function CategoryColumn({
  type,
  categories,
  icon: Icon,
  colorClass,
  label,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onDuplicateCategory,
  onMoveCategory,
  isAddingCategory,
  activeColumn,
  onStartAdd,
  onCancelAdd,
  editingCategory,
  onStartEdit,
  onCancelEdit,
  isCreateLoading,
  isUpdateLoading,
}: CategoryColumnProps) {
  const columnKey = type.toLowerCase() as "wants" | "needs" | "investment";
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollShadow, setShowScrollShadow] = useState(false);

  // Check if content is scrollable and show/hide shadow accordingly
  useEffect(() => {
    const checkScrollable = () => {
      const element = scrollContainerRef.current;
      if (element) {
        const isScrollable = element.scrollHeight > element.clientHeight;
        setShowScrollShadow(isScrollable);
      }
    };

    checkScrollable();
    // Re-check when categories change
    const resizeObserver = new ResizeObserver(checkScrollable);
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [categories]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add(
      "bg-gray-50",
      "border-2",
      "border-dashed",
      "border-gray-300",
    );
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove(
      "bg-gray-50",
      "border-2",
      "border-dashed",
      "border-gray-300",
    );
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove(
      "bg-gray-50",
      "border-2",
      "border-dashed",
      "border-gray-300",
    );

    const categoryId = e.dataTransfer.getData("text/plain");
    if (categoryId) {
      await onMoveCategory(categoryId, type);
    }
  };

  return (
    <div
      className="flex h-[600px] flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className={`rounded-lg border p-4 ${colorClass}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Icon className="mr-2 h-5 w-5" />
            <span className="font-medium">{label}</span>
          </div>
          <span className="text-sm font-semibold">{categories.length}</span>
        </div>
      </div>

      {/* Add Template Button */}
      {!isAddingCategory && (
        <div className="mb-4 mt-4">
          <AddItemButton
            onClick={() => onStartAdd(columnKey)}
            title="Add Template"
            variant="compact"
          />
        </div>
      )}

      {/* Inline Add Form */}
      {isAddingCategory && activeColumn === columnKey && (
        <div className="mt-4">
          <AddCategoryForm
            onSubmit={onAddCategory}
            onCancel={onCancelAdd}
            isLoading={isCreateLoading}
            defaultValues={{ group: type }}
          />
        </div>
      )}

      {/* Categories List */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollContainerRef}
          className="scrollbar-hide absolute inset-0 space-y-4 overflow-y-auto"
        >
          {categories.map((category) => {
            const isEditing = editingCategory?.id === category.id;

            if (isEditing) {
              return (
                <AddCategoryForm
                  key={category.id}
                  onSubmit={onEditCategory}
                  onCancel={onCancelEdit}
                  isLoading={isUpdateLoading}
                  isEditing={true}
                  defaultValues={{
                    name: editingCategory.name,
                    group: editingCategory.group,
                  }}
                />
              );
            }

            return (
              <div
                key={category.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", category.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="group relative cursor-grab overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md active:cursor-grabbing"
              >
                {/* Category Type Badge */}
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
                  >
                    <Icon className="mr-1 h-3 w-3" />
                    {label}
                  </span>

                  {/* Action Menu */}
                  <div className="flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => onDuplicateCategory(category.id)}
                      className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      title="Duplicate template"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onStartEdit(category)}
                      className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      title="Edit template"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        onDeleteCategory(category.id, category.name)
                      }
                      className="rounded p-1 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                      title="Delete template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Drag Handle */}
                <div
                  className="absolute left-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical className="h-4 w-4 text-gray-400" />
                </div>

                {/* Category Name */}
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {category.name}
                </h3>

                {/* Template Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    Created {new Date(category.createdAt).toLocaleDateString()}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">
                    Template
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scroll Shadow Indicator */}
        {showScrollShadow && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent" />
        )}
      </div>
    </div>
  );
}
