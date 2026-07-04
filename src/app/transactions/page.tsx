"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  useTransactions,
  useAllTransactions,
  useDeleteTransaction,
  useCreateTransaction,
} from "@/lib/data-hooks/transactions/useTransactions";
import Pagination from "@/components/Pagination";
import { useBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import { useCards } from "@/lib/data-hooks/cards/useCards";
import { useCategories } from "@/lib/data-hooks/categories/useCategories";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Search,
  AlertCircle,
  Copy,
  Edit,
  Pencil,
  Trash2,
  Plus,
  Info,
  SlidersHorizontal,
  ScanLine,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
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

import type { TransactionWithRelations } from "@/lib/types/transaction";
import Button from "@/components/Button";
import StatsCard from "@/components/StatsCard";
import {
  getGroupColor,
  getCategoryBadgeColor,
  formatCurrency,
} from "@/lib/utils";
import { matchesTransactionFilters } from "@/lib/utils/transactions";

// URL param scheme (only non-default values are written to the URL):
// q=search, category, budget, card, start, end, sort, order, page, size
const SORT_VALUES: readonly TransactionSortBy[] = ["date", "amount", "name"];
const ORDER_VALUES: readonly TransactionSortOrder[] = ["asc", "desc"];
const DATE_PARAM_RE = /^\d{4}-\d{2}-\d{2}$/;

const parseSortByParam = (value: string | null): TransactionSortBy =>
  SORT_VALUES.includes(value as TransactionSortBy)
    ? (value as TransactionSortBy)
    : "date";

const parseSortOrderParam = (value: string | null): TransactionSortOrder =>
  ORDER_VALUES.includes(value as TransactionSortOrder)
    ? (value as TransactionSortOrder)
    : "desc";

const parsePositiveIntParam = (
  value: string | null,
  fallback: number,
): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseDateParam = (value: string | null): string =>
  value && DATE_PARAM_RE.test(value) ? value : "";

const TransactionsPageContent = () => {
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(() =>
    parsePositiveIntParam(searchParams.get("page"), 1),
  );
  const [pageSize, setPageSize] = useState(() =>
    parsePositiveIntParam(searchParams.get("size"), 20),
  );
  const {
    data: transactionsData,
    isLoading,
    error,
  } = useTransactions(currentPage, pageSize);
  const transactions = useMemo(
    () => transactionsData?.transactions ?? [],
    [transactionsData?.transactions],
  );
  const pagination = transactionsData?.pagination;

  // Get all transactions for stats calculation
  const { data: allTransactions = [] } = useAllTransactions();
  const { data: budgets = [] } = useBudgets();
  const { data: cards = [] } = useCards();
  const { data: groupedCategories } = useCategories();
  const deleteTransactionMutation = useDeleteTransaction();
  const createTransactionMutation = useCreateTransaction();
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    () => searchParams.get("category") ?? "all",
  ); // Stores default category ID
  const [selectedBudget, setSelectedBudget] = useState<string>(
    () => searchParams.get("budget") ?? "all",
  );
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
  const { setMobileHeaderAction } = useMobileHeaderAction();

  // Register the mobile header's scan-receipt shortcut; clean up on unmount
  // so it doesn't leak into other pages.
  useEffect(() => {
    setMobileHeaderAction({
      icon: <ScanLine className="h-5 w-5" />,
      label: "Scan receipt",
      onClick: () => setShowReceiptScanModal(true),
    });
    return () => setMobileHeaderAction(null);
  }, [setMobileHeaderAction]);

  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);
  const [transactionToDelete, setTransactionToDelete] =
    useState<TransactionWithRelations | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set(),
  );
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Keep filter/sort/pagination state mirrored into the URL (via replaceState,
  // not router.replace, so this never re-runs server components) so refresh,
  // back-navigation, and shared links restore the same view. Only non-default
  // values are written, keeping the URL clean when no filters are active.
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("q", searchTerm);
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (selectedBudget !== "all") params.set("budget", selectedBudget);
    if (selectedCard !== "all") params.set("card", selectedCard);
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    if (sortBy !== "date") params.set("sort", sortBy);
    if (sortOrder !== "desc") params.set("order", sortOrder);
    if (currentPage !== 1) params.set("page", String(currentPage));
    if (pageSize !== 20) params.set("size", String(pageSize));

    const query = params.toString();
    const newUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  }, [
    searchTerm,
    selectedCategory,
    selectedBudget,
    selectedCard,
    startDate,
    endDate,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
  ]);

  // Calculate transaction statistics from all transactions with applied filters
  const stats = useMemo(() => {
    // Apply the same filters to all transactions for stats calculation
    const filteredTransactions = allTransactions.filter((transaction) =>
      matchesTransactionFilters(transaction, {
        searchTerm,
        selectedCategory,
        selectedBudget,
        selectedCard,
        startDate,
        endDate,
      }),
    );

    const totalTransactions = filteredTransactions.length;
    const totalAmount =
      filteredTransactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0;
    const averageAmount =
      totalTransactions > 0 ? totalAmount / totalTransactions : 0;
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const thisMonthTransactions = filteredTransactions.filter((t) => {
      const date = new Date(t.createdAt);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    });
    const thisMonthAmount = thisMonthTransactions?.reduce(
      (sum, t) => sum + t.amount,
      0,
    );

    return {
      totalTransactions,
      totalAmount,
      averageAmount,
      thisMonthTransactions: thisMonthTransactions.length,
      thisMonthAmount,
    };
  }, [
    allTransactions,
    searchTerm,
    selectedCategory,
    selectedBudget,
    selectedCard,
    startDate,
    endDate,
  ]);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    const filtered = transactions.filter((transaction) =>
      matchesTransactionFilters(transaction, {
        searchTerm,
        selectedCategory,
        selectedBudget,
        selectedCard,
        startDate,
        endDate,
      }),
    );

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
    selectedBudget,
    selectedCard,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  ]);

  // Get unique default categories for filter (flatten grouped categories)
  const categories = useMemo(() => {
    if (!groupedCategories) return [];

    // Flatten all default categories from all groups
    const allDefaultCategories = [
      ...(groupedCategories.wants || []),
      ...(groupedCategories.needs || []),
      ...(groupedCategories.investment || []),
    ];

    // Return all default categories sorted by name
    return allDefaultCategories.sort((a, b) => a.name.localeCompare(b.name));
  }, [groupedCategories]);

  // Get unique budgets for filter
  const availableBudgets = useMemo(() => {
    return budgets.sort((a, b) => a.name.localeCompare(b.name));
  }, [budgets]);

  // Get unique cards for filter from all transactions
  const availableCards = useMemo(() => {
    const cardSet = new Set<string>();
    allTransactions.forEach((t) => {
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
  }, [allTransactions, cards]);

  const handleCopyTransaction = async (
    transaction: TransactionWithRelations,
  ) => {
    try {
      // Don't allow copying card payment transactions
      if (transaction.transactionType === "CARD_PAYMENT") {
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
    if (transaction.transactionType === "CARD_PAYMENT") {
      toast.error(
        "Card payment transactions cannot be edited. Please delete and recreate if needed.",
      );
      return;
    } else {
      setEditingTransactionId(transaction.id);
    }
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
    setSelectedBudget("all");
    setSelectedCard("all");
    setStartDate("");
    setEndDate("");
    setSortBy("date");
    setSortOrder("desc");
    setPageSize(20);
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset to first page when filters change
  const handleFilterChange = (filterType: string, value: string) => {
    setCurrentPage(1);
    switch (filterType) {
      case "search":
        setSearchTerm(value);
        break;
      case "category":
        setSelectedCategory(value);
        break;
      case "budget":
        setSelectedBudget(value);
        break;
      case "card":
        setSelectedCard(value);
        break;
      case "startDate":
        setStartDate(value);
        break;
      case "endDate":
        setEndDate(value);
        break;
    }
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchTerm ||
    selectedCategory !== "all" ||
    selectedBudget !== "all" ||
    selectedCard !== "all" ||
    startDate ||
    endDate;

  // Count non-search filters for the mobile filter icon badge
  const activeModalFilterCount = [
    selectedCategory !== "all",
    selectedBudget !== "all",
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
    pageSize,
    selectedBudget,
  };

  const defaultFilterValues: TransactionFilterValues = {
    startDate: "",
    endDate: "",
    sortBy: "date",
    sortOrder: "desc",
    selectedCategory: "all",
    selectedCard: "all",
    pageSize: 20,
    selectedBudget: "all",
  };

  const handleApplyFilters = (values: TransactionFilterValues) => {
    setCurrentPage(1);
    setStartDate(values.startDate);
    setEndDate(values.endDate);
    setSortBy(values.sortBy);
    setSortOrder(values.sortOrder);
    setSelectedCategory(values.selectedCategory);
    setSelectedCard(values.selectedCard);
    if (values.pageSize !== undefined) setPageSize(values.pageSize);
    if (values.selectedBudget !== undefined)
      setSelectedBudget(values.selectedBudget);
  };

  usePageLoading(isLoading, "Loading transactions...");
  if (isLoading) {
    return null;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mb-4 text-red-500">
            <AlertCircle className="mx-auto h-12 w-12" />
          </div>
          <div className="mb-2 text-lg text-red-600">
            Error loading transactions
          </div>
          <div className="text-sm text-gray-500">{error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-surface lg:h-screen">
      <PageHeader
        title="Transactions"
        description="Track and manage transactions"
        action={{
          label: "Add transaction",
          onClick: () => setShowAddTransactionModal(true),
          icon: <Plus className="h-4 w-4" />,
        }}
        actions={[
          {
            label: "Scan receipt",
            onClick: () => setShowReceiptScanModal(true),
            icon: <ScanLine className="h-4 w-4" />,
            variant: "outline",
          },
        ]}
      />

      <div className="pt-4 lg:flex-1 lg:overflow-hidden lg:pt-0">
        <div className="lg:h-full lg:overflow-y-auto">
          <div className="mx-auto w-full px-2 py-4 pb-28 sm:px-4 sm:py-6 sm:pb-28 lg:px-8 lg:py-4 lg:pb-8">
            {/* Overview Stats */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
              <StatsCard
                title="Total transactions"
                value={stats.totalTransactions}
                subtitle="All time"
                icon={
                  <DollarSign className="h-4 w-4 text-secondary-600 sm:h-5 sm:w-5" />
                }
                iconColor="text-secondary-600"
              />

              <StatsCard
                title="Total amount"
                value={formatCurrency(stats.totalAmount)}
                subtitle="All time"
                icon={
                  <TrendingDown className="h-4 w-4 text-red-500 sm:h-5 sm:w-5" />
                }
                iconColor="text-red-500"
              />

              <StatsCard
                title="Average transaction"
                value={formatCurrency(stats.averageAmount)}
                subtitle="Per transaction"
                icon={
                  <TrendingUp className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />
                }
                iconColor="text-green-600"
              />

              <StatsCard
                title="This month"
                value={formatCurrency(stats.thisMonthAmount)}
                subtitle={`${stats.thisMonthTransactions} transactions`}
                icon={
                  <Calendar className="h-4 w-4 text-secondary-600 sm:h-5 sm:w-5" />
                }
                iconColor="text-secondary-600"
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
                    onChange={(e) =>
                      handleFilterChange("search", e.target.value)
                    }
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

            {/* Add Transaction Modal */}
            <AddTransactionModal
              isOpen={showAddTransactionModal}
              onClose={handleCloseAddTransactionModal}
              onSuccess={handleTransactionSuccess}
            />

            {/* Scan Receipt Modal */}
            <ReceiptScanModal
              isOpen={showReceiptScanModal}
              onClose={() => setShowReceiptScanModal(false)}
            />

            {/* Filters Modal */}
            <TransactionFiltersModal
              isOpen={showFiltersModal}
              onClose={() => setShowFiltersModal(false)}
              values={currentFilterValues}
              defaultValues={defaultFilterValues}
              onApply={handleApplyFilters}
              onClear={clearModalFilters}
              categories={categories}
              cards={availableCards}
              budgets={availableBudgets}
            />

            {/* Bulk Actions Bar */}
            {selectedTransactions.size > 0 && (
              <div className="mb-4 rounded-2xl border border-secondary-200 bg-secondary-50 p-3 shadow-soft sm:mb-6 sm:p-4">
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4">
                    <span className="text-sm font-medium tabular-nums text-secondary-800">
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
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {transaction.name ?? "Unnamed transaction"}
                                </span>
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    transaction.transactionType ===
                                    "CARD_PAYMENT"
                                      ? "bg-primary text-white"
                                      : transaction.category
                                        ? getCategoryBadgeColor(
                                            transaction.category.group,
                                          )
                                        : getCategoryBadgeColor()
                                  }`}
                                >
                                  {transaction.transactionType ===
                                  "CARD_PAYMENT"
                                    ? "Card Payment"
                                    : (transaction.category?.name ??
                                      "No Category")}
                                </span>
                                {transaction.description && (
                                  <div className="group relative flex-shrink-0">
                                    <Info className="h-4 w-4 cursor-help text-gray-400" />
                                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-primary-950 px-3 py-2 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                      {transaction.description}
                                      <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {transaction.description && (
                                <p className="mt-1 text-xs text-gray-500">
                                  {transaction.description}
                                </p>
                              )}
                              <div className="mt-1 flex items-center space-x-2 text-xs text-gray-400">
                                <span>
                                  {new Date(
                                    transaction.occurredAt ??
                                      transaction.createdAt,
                                  ).toLocaleDateString()}
                                </span>
                                {transaction.Budget && (
                                  <>
                                    <span className="hidden sm:inline">•</span>
                                    <span className="hidden truncate sm:inline">
                                      {transaction.Budget.name}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 sm:space-x-4">
                            {/* Action Icons - Copy stays visible on mobile;
                              Edit/Delete are desktop-hover only there since
                              mobile exposes them via swipe (SwipeableRow). */}
                            <div className="flex items-center gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                              <button
                                onClick={() =>
                                  handleCopyTransaction(transaction)
                                }
                                className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900"
                                title="Copy transaction"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleEditTransaction(transaction)
                                }
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
                                  transaction.transactionType === "RETURN" ||
                                  transaction.transactionType === "INCOME" ||
                                  transaction.amount < 0
                                    ? "text-green-600" // Money coming in shows green
                                    : "text-gray-900"
                                }`}
                              >
                                {transaction.transactionType === "RETURN" ||
                                transaction.transactionType === "INCOME"
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
                      </SwipeableRow>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center gap-3 px-3 py-12 text-center sm:px-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
                      <DollarSign className="h-7 w-7" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight text-gray-900">
                      {hasActiveFilters
                        ? "No matching transactions"
                        : "No transactions yet"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {hasActiveFilters
                        ? "Try adjusting your search or filter criteria"
                        : "Start adding transactions to see them here"}
                    </p>
                    <Button
                      onClick={() => setShowAddTransactionModal(true)}
                      variant="primary"
                      size="md"
                      className="mt-1"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add transaction
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="card-surface mt-6 p-4">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  hasNextPage={pagination.hasNextPage}
                  hasPreviousPage={pagination.hasPreviousPage}
                  totalCount={pagination.totalCount}
                  limit={pagination.limit}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!transactionToDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Transaction"
        message="Are you sure you want to delete the transaction '{itemName}'? This action cannot be undone."
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
    </div>
  );
};

const TransactionsPage = () => (
  <Suspense fallback={null}>
    <TransactionsPageContent />
  </Suspense>
);

export default TransactionsPage;
