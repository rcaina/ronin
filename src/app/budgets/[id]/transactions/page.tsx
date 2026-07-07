"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { useBudgetTransactions } from "@/lib/data-hooks/budgets/useBudgetTransactions";
import {
  useDeleteTransaction,
  useCreateTransaction,
} from "@/lib/data-hooks/transactions/useTransactions";
import { useCards } from "@/lib/data-hooks/cards/useCards";
import {
  DollarSign,
  Search,
  AlertCircle,
  Copy,
  Edit,
  Pencil,
  Trash2,
  Info,
  SlidersHorizontal,
  Target,
  Receipt,
  TrendingDown,
  Plus,
  ScanLine,
  ChevronDown,
} from "lucide-react";

import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import SwipeableRow from "@/components/SwipeableRow";
import { usePageLoading } from "@/components/ConditionalLayout";
import { useMobileHeaderAction } from "@/components/MobileHeaderActionContext";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import ReceiptScanModal from "@/components/transactions/ReceiptScanModal";
import InlineTransactionEdit from "@/components/transactions/InlineTransactionEdit";
import TransactionFiltersModal, {
  type TransactionFilterValues,
  type TransactionSortBy,
  type TransactionSortOrder,
} from "@/components/transactions/TransactionFiltersModal";
import StatsCard from "@/components/StatsCard";

import type { TransactionWithRelations } from "@/lib/types/transaction";
import Button from "@/components/Button";
import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { TransactionType, CategoryType } from "@prisma/client";
import {
  getGroupColor,
  getCategoryBadgeColor,
  formatCurrency,
  parseLocalDate,
} from "@/lib/utils";
import {
  SPLIT_BADGE_CLASSES,
  getSplitBadgeLabel,
} from "@/lib/utils/transactions";
import { useBudgetHeader } from "../../../../../components/budgets/BudgetHeaderContext";
import LockedBudgetGate from "../LockedBudgetGate";

// URL param scheme (only non-default values are written to the URL). `category`
// and `card` are an existing deep-link contract from category cards elsewhere
// in the app — keep those exact names.
const SORT_VALUES: readonly TransactionSortBy[] = ["date", "amount", "name"];
const ORDER_VALUES: readonly TransactionSortOrder[] = ["asc", "desc"];
const DATE_PARAM_RE = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORY_TYPE_VALUES = Object.values(CategoryType);

const parseSortByParam = (value: string | null): TransactionSortBy =>
  SORT_VALUES.includes(value as TransactionSortBy)
    ? (value as TransactionSortBy)
    : "date";

const parseSortOrderParam = (value: string | null): TransactionSortOrder =>
  ORDER_VALUES.includes(value as TransactionSortOrder)
    ? (value as TransactionSortOrder)
    : "desc";

const parseDateParam = (value: string | null): string =>
  value && DATE_PARAM_RE.test(value) ? value : "";

const parseCategoryTypeParam = (value: string | null): CategoryType | "all" =>
  value && CATEGORY_TYPE_VALUES.includes(value as CategoryType)
    ? (value as CategoryType)
    : "all";

const BudgetTransactionsPageContent = () => {
  const params = useParams();
  const budgetId = params.id as string;
  const searchParams = useSearchParams();

  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useBudgetTransactions(budgetId);
  const { data: cards = [] } = useCards();
  const {
    data: budget,
    isLoading: budgetLoading,
    error: budgetError,
  } = useBudget(budgetId);
  const deleteTransactionMutation = useDeleteTransaction();
  const createTransactionMutation = useCreateTransaction();
  const { setActions } = useBudgetHeader();
  const { setMobileHeaderAction } = useMobileHeaderAction();

  // Locked budgets (downgraded past the free active-budget limit) are
  // hard-blocked: the page early-returns a full-screen gate below. This flag
  // only suppresses the shared header chrome (which renders separately) while
  // the gate is shown.
  const isLocked = budget?.locked ?? false;

  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    () => searchParams.get("category") ?? "all",
  );
  const [selectedCategoryType, setSelectedCategoryType] = useState<
    CategoryType | "all"
  >(() => parseCategoryTypeParam(searchParams.get("type")));
  const [selectedCard, setSelectedCard] = useState<string>(
    () => searchParams.get("card") ?? "all",
  );
  const [startDate, setStartDate] = useState<string>(() =>
    parseDateParam(searchParams.get("start")),
  );
  const [endDate, setEndDate] = useState<string>(() =>
    parseDateParam(searchParams.get("end")),
  );
  const [sortBy, setSortBy] = useState<TransactionSortBy>(() =>
    parseSortByParam(searchParams.get("sort")),
  );
  const [sortOrder, setSortOrder] = useState<TransactionSortOrder>(() =>
    parseSortOrderParam(searchParams.get("order")),
  );
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [showReceiptScanModal, setShowReceiptScanModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);
  const [editingSplitTransaction, setEditingSplitTransaction] =
    useState<TransactionWithRelations | null>(null);
  const [transactionToDelete, setTransactionToDelete] =
    useState<TransactionWithRelations | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set(),
  );
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [expandedSplitIds, setExpandedSplitIds] = useState<Set<string>>(
    new Set(),
  );

  const toggleSplitExpanded = (transactionId: string) => {
    setExpandedSplitIds((prev) => {
      const next = new Set(prev);
      if (next.has(transactionId)) {
        next.delete(transactionId);
      } else {
        next.add(transactionId);
      }
      return next;
    });
  };

  // Register header actions. Locked budgets are hard-blocked (the page renders
  // only the gate), so we drop every header action.
  useEffect(() => {
    if (isLocked) {
      setActions([]);
      return;
    }
    setActions([
      {
        icon: <Plus className="h-4 w-4" />,
        label: "Add transaction",
        onClick: () => setShowAddTransactionModal(true),
        variant: "primary" as const,
      },
      {
        icon: <ScanLine className="h-4 w-4" />,
        label: "Scan receipt",
        onClick: () => setShowReceiptScanModal(true),
        variant: "outline" as const,
      },
    ]);
  }, [setActions, isLocked]);

  // Register the mobile header's scan-receipt shortcut; clean up on unmount
  // so it doesn't leak into other pages. Suppressed while locked.
  useEffect(() => {
    if (isLocked) {
      setMobileHeaderAction(null);
      return;
    }
    setMobileHeaderAction({
      icon: <ScanLine className="h-5 w-5" />,
      label: "Scan receipt",
      onClick: () => setShowReceiptScanModal(true),
    });
    return () => setMobileHeaderAction(null);
  }, [setMobileHeaderAction, isLocked]);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    const filtered = transactions.filter((transaction) => {
      try {
        // Search term matching (including amount)
        const searchLower = searchTerm.toLowerCase().trim();
        let matchesSearch = true; // Default to true if no search term

        if (searchLower) {
          const nameMatch =
            transaction.name?.toLowerCase().includes(searchLower) ?? false;
          const descriptionMatch =
            transaction.description?.toLowerCase().includes(searchLower) ??
            false;
          const categoryMatch =
            transaction.category?.name?.toLowerCase().includes(searchLower) ??
            false;

          // Only search amounts if the search term contains numbers
          const searchNumbers = searchLower.replace(/[^0-9.]/g, "");
          const amountMatch = searchNumbers
            ? Math.abs(transaction.amount).toString().includes(searchNumbers)
            : false;

          const formattedAmountMatch = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          })
            .format(transaction.amount)
            .toLowerCase()
            .includes(searchLower);

          matchesSearch =
            nameMatch ||
            descriptionMatch ||
            categoryMatch ||
            amountMatch ||
            formattedAmountMatch;
        }

        // Category filter — matches the transaction's own category, or (for
        // split transactions) any of its splits' categories.
        const matchesCategory =
          selectedCategory === "all" ||
          transaction.category?.id === selectedCategory ||
          (transaction.splits?.some(
            (split) => split.category.id === selectedCategory,
          ) ??
            false);

        // Category type filter — same split-aware treatment.
        const matchesCategoryType =
          selectedCategoryType === "all" ||
          transaction.category?.group === selectedCategoryType ||
          (transaction.splits?.some(
            (split) => split.category.group === selectedCategoryType,
          ) ??
            false);

        // Card filter
        const matchesCard =
          selectedCard === "all" ||
          (selectedCard === "no-card" && !transaction.cardId) ||
          transaction.cardId === selectedCard;

        // Date range filter
        const matchesDateRange = (() => {
          if (!startDate && !endDate) return true;

          const transactionDate = transaction.occurredAt
            ? new Date(transaction.occurredAt)
            : new Date(transaction.createdAt);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;

          if (start && end) {
            return transactionDate >= start && transactionDate <= end;
          } else if (start) {
            return transactionDate >= start;
          } else if (end) {
            return transactionDate <= end;
          }
          return true;
        })();

        return (
          matchesSearch &&
          matchesCategory &&
          matchesCategoryType &&
          matchesCard &&
          matchesDateRange
        );
      } catch (error) {
        console.error("Error filtering transaction:", error, transaction);
        return false;
      }
    });

    // Sort transactions
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "date":
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "amount":
          comparison = a.amount - b.amount;
          break;
        case "name":
          comparison = (a.name ?? "").localeCompare(b.name ?? "");
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [
    transactions,
    searchTerm,
    selectedCategory,
    selectedCategoryType,
    selectedCard,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  ]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const uniqueCategories = new Map<
      string,
      { id: string; name: string; group: string; actualCategoryId: string }
    >();
    transactions.forEach((t) => {
      if (t.category && !uniqueCategories.has(t.category.id)) {
        uniqueCategories.set(t.category.id, {
          id: t.category.id,
          name: t.category.name,
          group: t.category.group,
          actualCategoryId: t.category.id,
        });
      }
    });
    return Array.from(uniqueCategories.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [transactions]);

  // Get unique cards for filter
  const availableCards = useMemo(() => {
    const cardSet = new Set<string>();
    transactions.forEach((t) => {
      if (t.cardId) {
        cardSet.add(t.cardId);
      }
    });

    return cards
      .filter((card) => cardSet.has(card.id))
      .map((card) => ({
        ...card,
        displayName: `${card.name} - ${card.user.name}`,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [transactions, cards]);

  // Keep filter/sort state mirrored into the URL (via replaceState, not
  // router.replace, so this never re-runs server components) so refresh,
  // back-navigation, and shared/deep links (e.g. `?category=` / `?card=` from
  // category cards elsewhere in the app) restore the same view. Only
  // non-default values are written, keeping the URL clean when unfiltered.
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("q", searchTerm);
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (selectedCategoryType !== "all")
      params.set("type", selectedCategoryType);
    if (selectedCard !== "all") params.set("card", selectedCard);
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    if (sortBy !== "date") params.set("sort", sortBy);
    if (sortOrder !== "desc") params.set("order", sortOrder);

    const query = params.toString();
    const newUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  }, [
    searchTerm,
    selectedCategory,
    selectedCategoryType,
    selectedCard,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  ]);

  const handleCopyTransaction = async (
    transaction: TransactionWithRelations,
  ) => {
    try {
      // Don't allow copying card payment transactions
      if (transaction.transactionType === TransactionType.CARD_PAYMENT) {
        toast.error("Card payment transactions cannot be copied.");
        return;
      }

      // Create a copy with "Copy" appended to the name
      const copyData = {
        name: transaction.name ? `${transaction.name} Copy` : undefined,
        description: transaction.description ?? undefined,
        amount: Math.abs(transaction.amount),
        budgetId: transaction.budgetId ?? "",
        categoryId: transaction.categoryId ?? undefined,
        cardId: transaction.cardId ?? undefined,
        transactionType: transaction.transactionType,
        createdAt: new Date().toISOString(),
        splits: transaction.splits?.length
          ? transaction.splits.map((split) => ({
              categoryId: split.categoryId,
              amount: split.amount,
              note: split.note ?? undefined,
            }))
          : undefined,
      };

      await createTransactionMutation.mutateAsync(copyData);
      toast.success("Transaction copied successfully!");
    } catch (err) {
      console.error("Failed to copy transaction:", err);
      toast.error("Failed to copy transaction. Please try again.");
    }
  };

  const handleEditTransaction = (transaction: TransactionWithRelations) => {
    // Check if this is a card payment transaction
    if (transaction.transactionType === TransactionType.CARD_PAYMENT) {
      toast.error(
        "Card payment transactions cannot be edited. Please delete and recreate if needed.",
      );
      return;
    }
    // Split transactions aren't safe to edit inline (it could corrupt the
    // per-category breakdown) — route to the full form modal instead.
    if (transaction.splits && transaction.splits.length > 0) {
      setEditingSplitTransaction(transaction);
      return;
    }
    setEditingTransactionId(transaction.id);
  };

  const handleDeleteTransaction = (transaction: TransactionWithRelations) => {
    setTransactionToDelete(transaction);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;

    try {
      await deleteTransactionMutation.mutateAsync({
        id: transactionToDelete.id,
        budgetId: transactionToDelete.budgetId,
      });
      setTransactionToDelete(null);
      toast.success("Transaction deleted successfully!");
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      toast.error("Failed to delete transaction. Please try again.");
    }
  };

  const handleCancelDelete = () => {
    setTransactionToDelete(null);
  };

  const handleCloseAddTransactionModal = () => {
    setShowAddTransactionModal(false);
  };

  const handleTransactionSuccess = () => {
    // Modal will stay open for adding multiple transactions
    // User can manually close it when done
  };

  const handleInlineEditCancel = () => {
    setEditingTransactionId(null);
  };

  const handleInlineEditSuccess = () => {
    setEditingTransactionId(null);
  };

  // Bulk selection handlers
  const handleSelectAll = () => {
    // Filter out transactions that are being edited
    const selectableTransactions = filteredAndSortedTransactions.filter(
      (t) => t.id !== editingTransactionId,
    );

    if (selectedTransactions.size === selectableTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(selectableTransactions.map((t) => t.id)));
    }
  };

  const handleSelectTransaction = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteModal(true);
  };

  const handleConfirmBulkDelete = async () => {
    try {
      const deletePromises = Array.from(selectedTransactions).map((id) => {
        const transaction = transactions.find((t) => t.id === id);
        return deleteTransactionMutation.mutateAsync({
          id,
          budgetId: transaction?.budgetId,
        });
      });
      await Promise.all(deletePromises);
      setSelectedTransactions(new Set());
      setShowBulkDeleteModal(false);
      toast.success(
        `${selectedTransactions.size} transaction${selectedTransactions.size !== 1 ? "s" : ""} deleted successfully!`,
      );
    } catch (err) {
      console.error("Failed to delete transactions:", err);
      toast.error("Failed to delete some transactions. Please try again.");
    }
  };

  const handleCancelBulkDelete = () => {
    setShowBulkDeleteModal(false);
  };

  // Clear filters from the filters modal — search stays untouched
  // since it lives on the page row, outside the modal.
  const clearModalFilters = () => {
    setSelectedCategory("all");
    setSelectedCategoryType("all");
    setSelectedCard("all");
    setStartDate("");
    setEndDate("");
    setSortBy("date");
    setSortOrder("desc");
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchTerm ||
    selectedCategory !== "all" ||
    selectedCategoryType !== "all" ||
    selectedCard !== "all" ||
    startDate ||
    endDate;

  // Count non-search filters for the mobile filter icon badge
  const activeModalFilterCount = [
    selectedCategory !== "all",
    selectedCategoryType !== "all",
    selectedCard !== "all",
    !!startDate,
    !!endDate,
    sortBy !== "date" || sortOrder !== "desc",
  ].filter(Boolean).length;

  const currentFilterValues: TransactionFilterValues = {
    startDate,
    endDate,
    sortBy,
    sortOrder,
    selectedCategory,
    selectedCard,
    selectedCategoryType,
  };

  const defaultFilterValues: TransactionFilterValues = {
    startDate: "",
    endDate: "",
    sortBy: "date",
    sortOrder: "desc",
    selectedCategory: "all",
    selectedCard: "all",
    selectedCategoryType: "all",
  };

  const handleApplyFilters = (values: TransactionFilterValues) => {
    setStartDate(values.startDate);
    setEndDate(values.endDate);
    setSortBy(values.sortBy);
    setSortOrder(values.sortOrder);
    setSelectedCategory(values.selectedCategory);
    setSelectedCard(values.selectedCard);
    if (values.selectedCategoryType !== undefined)
      setSelectedCategoryType(values.selectedCategoryType);
  };

  // Calculate total spent from filtered transactions
  const totalSpent = useMemo(() => {
    return filteredAndSortedTransactions.reduce((total, transaction) => {
      // Exclude INCOME and CARD_PAYMENT transactions from spending calculations
      if (
        transaction.transactionType === TransactionType.INCOME ||
        transaction.transactionType === TransactionType.CARD_PAYMENT
      ) {
        return total;
      }

      // For returns, subtract the amount (since it's positive, we subtract to reduce total spent)
      if (transaction.transactionType === TransactionType.RETURN) {
        return total - Math.abs(transaction.amount);
      }

      // For regular transactions, add the absolute value (since expenses are negative)
      return total + Math.abs(transaction.amount);
    }, 0);
  }, [filteredAndSortedTransactions]);

  // Show loading state while either budget or transactions are loading
  const isPageLoading = budgetLoading || transactionsLoading;
  usePageLoading(isPageLoading, "Loading budget transactions...");
  if (isPageLoading) {
    return null;
  }

  // Show error state if there's an error with budget or transactions
  if (budgetError || transactionsError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mb-4 text-red-500">
            <AlertCircle className="mx-auto h-12 w-12" />
          </div>
          <div className="mb-2 text-lg text-red-600">
            Error loading budget transactions
          </div>
          <div className="text-sm text-gray-500">
            {budgetError?.message ??
              transactionsError?.message ??
              "An unexpected error occurred"}
          </div>
        </div>
      </div>
    );
  }

  // Show not found state if budget doesn't exist
  if (!budget) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
            <Target className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            Budget not found
          </div>
        </div>
      </div>
    );
  }

  // Locked budgets (downgraded past the free active-budget limit) are
  // hard-blocked: render ONLY the upgrade gate, never the transactions list or
  // any mutating controls. Reaching here via direct URL/deep link still gates.
  if (budget.locked) {
    return <LockedBudgetGate />;
  }

  return (
    <>
      <div className="bg-surface lg:h-full lg:overflow-y-auto">
        <div className="mx-auto w-full px-2 py-4 pb-28 sm:px-4 sm:py-6 lg:px-8 lg:py-4 lg:pb-8">
          {/* Stats Cards */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
            <StatsCard
              title="Transactions"
              value={filteredAndSortedTransactions.length}
              subtitle={
                hasActiveFilters ? "Filtered results" : "Total transactions"
              }
              icon={<Receipt className="h-4 w-4" />}
            />
            <StatsCard
              title="Total spent"
              value={formatCurrency(totalSpent)}
              subtitle={
                hasActiveFilters
                  ? "From filtered transactions"
                  : "All transactions"
              }
              icon={<TrendingDown className="h-4 w-4" />}
              iconColor="text-green-600"
            />
          </div>
          {/* Filters and Search — search + filter icon on one row at every
              breakpoint; full filters live in TransactionFiltersModal. */}
          <div className="card-surface mb-4 p-3 sm:mb-6 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-surface-card py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFiltersModal(true)}
                className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-surface-card text-gray-600 transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50"
                aria-label="Open filters"
              >
                <SlidersHorizontal className="h-5 w-5" />
                {activeModalFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-semibold text-primary-950">
                    {activeModalFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filters Modal */}
          <TransactionFiltersModal
            isOpen={showFiltersModal}
            onClose={() => setShowFiltersModal(false)}
            values={currentFilterValues}
            defaultValues={defaultFilterValues}
            onApply={handleApplyFilters}
            onClear={clearModalFilters}
            categories={categories.map((category) => ({
              id: category.actualCategoryId,
              name: category.name,
            }))}
            cards={availableCards}
          />

          {/* Add Transaction Modal */}
          <AddTransactionModal
            isOpen={showAddTransactionModal}
            onClose={handleCloseAddTransactionModal}
            onSuccess={handleTransactionSuccess}
            budgetId={budgetId}
          />

          {/* Edit Split Transaction Modal — split transactions route here
              instead of the inline editor (see handleEditTransaction). */}
          <AddTransactionModal
            isOpen={!!editingSplitTransaction}
            transaction={editingSplitTransaction ?? undefined}
            onClose={() => setEditingSplitTransaction(null)}
            onSuccess={() => setEditingSplitTransaction(null)}
            budgetId={budgetId}
          />

          {/* Scan Receipt Modal */}
          <ReceiptScanModal
            isOpen={showReceiptScanModal}
            onClose={() => setShowReceiptScanModal(false)}
            budgetId={budgetId}
          />

          {/* Bulk Actions Bar */}
          {selectedTransactions.size > 0 && (
            <div className="mb-4 rounded-2xl border border-secondary-200/70 bg-secondary-50 p-3 shadow-soft sm:mb-6 sm:p-4">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4">
                  <span className="text-sm font-medium text-secondary-900">
                    {selectedTransactions.size} transaction
                    {selectedTransactions.size !== 1 ? "s" : ""} selected
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedTransactions(new Set())}
                    className="text-sm text-secondary-700 hover:text-secondary-800"
                  >
                    Clear selection
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleBulkDelete}
                    variant="danger"
                    size="sm"
                    disabled={deleteTransactionMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete selected
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Transactions List */}
          <div className="card-surface overflow-hidden">
            <div className="border-b border-gray-100 px-3 py-3 sm:px-6 sm:py-4">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={
                        selectedTransactions.size ===
                          filteredAndSortedTransactions.filter(
                            (t) => t.id !== editingTransactionId,
                          ).length &&
                        filteredAndSortedTransactions.filter(
                          (t) => t.id !== editingTransactionId,
                        ).length > 0
                      }
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-secondary-600 focus:ring-secondary"
                    />
                    <span>Select all</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredAndSortedTransactions.length > 0 ? (
                filteredAndSortedTransactions.map((transaction) => {
                  // Check if this transaction is being edited
                  const isEditing = editingTransactionId === transaction.id;

                  if (isEditing) {
                    return (
                      <InlineTransactionEdit
                        key={transaction.id}
                        transaction={transaction}
                        onCancel={handleInlineEditCancel}
                        onSuccess={handleInlineEditSuccess}
                        getGroupColor={getGroupColor}
                      />
                    );
                  }

                  const hasSplits = (transaction.splits?.length ?? 0) > 0;
                  const isSplitExpanded = expandedSplitIds.has(transaction.id);

                  return (
                    <SwipeableRow
                      key={transaction.id}
                      disabled={isEditing}
                      actions={[
                        {
                          icon: <Pencil className="h-4 w-4" />,
                          label: "Edit",
                          onClick: () => handleEditTransaction(transaction),
                        },
                        {
                          icon: <Trash2 className="h-4 w-4" />,
                          label: "Delete",
                          onClick: () => handleDeleteTransaction(transaction),
                          tone: "danger",
                        },
                      ]}
                    >
                      <div className="group flex items-center justify-between p-3 transition-colors duration-200 hover:bg-surface sm:p-4">
                        <div className="flex min-w-0 flex-1 items-center space-x-3 sm:space-x-4">
                          <input
                            type="checkbox"
                            checked={selectedTransactions.has(transaction.id)}
                            onChange={() =>
                              handleSelectTransaction(transaction.id)
                            }
                            disabled={isEditing}
                            className="h-4 w-4 rounded border-gray-300 text-secondary-600 focus:ring-secondary disabled:opacity-50"
                          />
                          {hasSplits && (
                            <button
                              type="button"
                              onClick={() =>
                                toggleSplitExpanded(transaction.id)
                              }
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-700"
                              aria-label={
                                isSplitExpanded
                                  ? "Hide split breakdown"
                                  : "Show split breakdown"
                              }
                              aria-expanded={isSplitExpanded}
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${
                                  isSplitExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                {transaction.name ?? "Unnamed transaction"}
                              </span>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                  transaction.transactionType ===
                                  TransactionType.CARD_PAYMENT
                                    ? "bg-gray-200 text-gray-500"
                                    : hasSplits
                                      ? SPLIT_BADGE_CLASSES
                                      : transaction.transactionType ===
                                            TransactionType.INCOME &&
                                          !transaction.category
                                        ? "bg-accent text-primary"
                                        : transaction.category
                                          ? getCategoryBadgeColor(
                                              transaction.category.group,
                                            )
                                          : getCategoryBadgeColor()
                                }`}
                              >
                                {transaction.transactionType ===
                                TransactionType.CARD_PAYMENT
                                  ? "Card Payment"
                                  : hasSplits
                                    ? getSplitBadgeLabel(
                                        transaction.splits?.length ?? 0,
                                      )
                                    : transaction.transactionType ===
                                          TransactionType.INCOME &&
                                        !transaction.category
                                      ? "Income"
                                      : (transaction.category?.name ??
                                        "No Category")}
                              </span>
                              {transaction.description && (
                                <div className="group relative flex-shrink-0">
                                  <Info className="h-4 w-4 cursor-help text-gray-400" />
                                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-xl bg-primary-950/90 px-3 py-2 text-sm text-white opacity-0 shadow-lifted transition-opacity duration-200 group-hover:opacity-100">
                                    {transaction.description}
                                    <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-primary-950/90"></div>
                                  </div>
                                </div>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-gray-400">
                              {parseLocalDate(
                                transaction.createdAt,
                              )?.toLocaleDateString() ?? ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 sm:space-x-4">
                          {/* Action Icons - Copy stays visible on mobile;
                            Edit/Delete are desktop-hover only there since
                            mobile exposes them via swipe (SwipeableRow). */}
                          <div className="flex items-center space-x-1 opacity-100 transition-opacity sm:space-x-2 lg:opacity-0 lg:group-hover:opacity-100">
                            <button
                              onClick={() => handleCopyTransaction(transaction)}
                              className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900"
                              title="Copy transaction"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditTransaction(transaction)}
                              className="hidden rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900 lg:block"
                              title="Edit transaction"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteTransaction(transaction)
                              }
                              className="hidden rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 lg:block"
                              title="Delete transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="text-right">
                            <div
                              className={`text-sm font-semibold tabular-nums ${
                                transaction.transactionType ===
                                TransactionType.RETURN
                                  ? "text-green-600" // Return transactions in green
                                  : transaction.transactionType ===
                                      TransactionType.CARD_PAYMENT
                                    ? transaction.amount < 0
                                      ? "text-green-600" // Source transaction (money going out from debit card)
                                      : "text-gray-900" // Destination transaction (money being added back to credit card)
                                    : transaction.amount < 0
                                      ? "text-green-600"
                                      : "text-gray-900"
                              }`}
                            >
                              {transaction.transactionType ===
                              TransactionType.RETURN
                                ? "+"
                                : ""}
                              {formatCurrency(Math.abs(transaction.amount))}
                            </div>
                            <div className="text-xs capitalize text-gray-500">
                              {transaction.transactionType
                                .toLowerCase()
                                .replace("_", " ")}
                            </div>
                          </div>
                        </div>
                      </div>
                      {hasSplits && isSplitExpanded && (
                        <div className="space-y-2 border-t border-gray-100 bg-surface px-3 py-3 sm:px-6">
                          {transaction.splits?.map((split) => (
                            <div
                              key={split.id}
                              className="flex items-center justify-between gap-3"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className={`inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${getCategoryBadgeColor(
                                    split.category.group,
                                  )}`}
                                >
                                  {split.category.name}
                                </span>
                                {split.note && (
                                  <span className="truncate text-xs text-gray-500">
                                    {split.note}
                                  </span>
                                )}
                              </div>
                              <span className="flex-shrink-0 text-sm font-medium tabular-nums text-gray-900">
                                {formatCurrency(Math.abs(split.amount))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </SwipeableRow>
                  );
                })
              ) : (
                <div className="flex flex-col items-center px-3 py-12 text-center sm:px-6">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
                    <DollarSign className="h-7 w-7" strokeWidth={1.5} />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">
                    {searchTerm ||
                    selectedCategory !== "all" ||
                    selectedCategoryType !== "all" ||
                    selectedCard !== "all"
                      ? "No matching transactions"
                      : "No transactions yet"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {searchTerm ||
                    selectedCategory !== "all" ||
                    selectedCategoryType !== "all" ||
                    selectedCard !== "all"
                      ? "Try adjusting your search or filter criteria"
                      : "Start adding transactions to see them here"}
                  </p>
                  <p className="mt-4 text-sm text-gray-400">
                    Use the &ldquo;Add transaction&rdquo; button in the header
                    to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!transactionToDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Transaction"
        message={
          transactionToDelete?.splits && transactionToDelete.splits.length > 0
            ? `This will delete the transaction '{itemName}' and its ${transactionToDelete.splits.length} category splits. This action cannot be undone.`
            : "Are you sure you want to delete the transaction '{itemName}'? This action cannot be undone."
        }
        itemName={transactionToDelete?.name ?? "Unnamed transaction"}
        isLoading={deleteTransactionMutation.isPending}
        loadingText="Deleting..."
        confirmText="Delete Transaction"
        cancelText="Cancel"
      />

      {/* Bulk Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showBulkDeleteModal}
        onClose={handleCancelBulkDelete}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Multiple Transactions"
        message="Are you sure you want to delete {itemName}? This action cannot be undone."
        itemName={`${selectedTransactions.size} selected transaction${selectedTransactions.size !== 1 ? "s" : ""}`}
        isLoading={deleteTransactionMutation.isPending}
        loadingText="Deleting..."
        confirmText="Delete Transactions"
        cancelText="Cancel"
      />
    </>
  );
};

const BudgetTransactionsPage = () => (
  <Suspense fallback={null}>
    <BudgetTransactionsPageContent />
  </Suspense>
);

export default BudgetTransactionsPage;
