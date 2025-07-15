"use client";

import { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import {
  useTransactions,
  useDeleteTransaction,
  useCreateTransaction,
} from "@/lib/data-hooks/transactions/useTransactions";
import { useBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import { useCards } from "@/lib/data-hooks/cards/useCards";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Search,
  AlertCircle,
  Copy,
  Edit,
  Trash2,
  Plus,
  Info,
  Filter,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import AddItemButton from "@/components/AddItemButton";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import TransactionForm from "@/components/transactions/TransactionForm";
import InlineTransactionEdit from "@/components/transactions/InlineTransactionEdit";

import type { TransactionWithRelations } from "@/lib/types/transaction";
import Button from "@/components/Button";

const TransactionsPage = () => {
  const { data: transactions = [], isLoading, error } = useTransactions();
  const { data: budgets = [] } = useBudgets();
  const { data: cards = [] } = useCards();
  const deleteTransactionMutation = useDeleteTransaction();
  const createTransactionMutation = useCreateTransaction();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBudget, setSelectedBudget] = useState<string>("all");
  const [selectedCard, setSelectedCard] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "name">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showTransactionForm, setShowTransactionForm] = useState(false);

  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);
  const [transactionToDelete, setTransactionToDelete] =
    useState<TransactionWithRelations | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set(),
  );
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Calculate transaction statistics
  const stats = useMemo(() => {
    const totalTransactions = transactions.length;
    const totalAmount =
      transactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0;
    const averageAmount =
      totalTransactions > 0 ? totalAmount / totalTransactions : 0;
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const thisMonthTransactions = transactions.filter((t) => {
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
  }, [transactions]);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    const filtered = transactions.filter((transaction) => {
      // Search term matching (including amount)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        (transaction.name?.toLowerCase().includes(searchLower) ?? false) ||
        (transaction.description?.toLowerCase().includes(searchLower) ??
          false) ||
        (transaction.category?.category.name
          .toLowerCase()
          .includes(searchLower) ??
          false) ||
        // Amount search - convert amount to string and search
        Math.abs(transaction.amount)
          .toString()
          .includes(searchTerm.replace(/[^0-9.]/g, "")) ||
        // Also search formatted amount (e.g., "100.50" matches "100.5")
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        })
          .format(transaction.amount)
          .toLowerCase()
          .includes(searchLower);

      // Category filter
      const matchesCategory =
        selectedCategory === "all" ||
        transaction.category?.id === selectedCategory;

      // Budget filter
      const matchesBudget =
        selectedBudget === "all" ||
        transaction.Budget?.id === selectedBudget ||
        (selectedBudget === "no-budget" && !transaction.Budget);

      // Card filter
      const matchesCard =
        selectedCard === "all" ||
        (selectedCard === "no-card" && !transaction.cardId) ||
        transaction.cardId === selectedCard;

      return matchesSearch && matchesCategory && matchesBudget && matchesCard;
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
    selectedBudget,
    selectedCard,
    sortBy,
    sortOrder,
  ]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const uniqueCategories = new Map<
      string,
      { id: string; name: string; group: string }
    >();
    transactions.forEach((t) => {
      if (t.category && !uniqueCategories.has(t.category.id)) {
        uniqueCategories.set(t.category.id, {
          id: t.category.id,
          name: t.category.category.name,
          group: t.category.category.group,
        });
      }
    });
    return Array.from(uniqueCategories.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [transactions]);

  // Get unique budgets for filter
  const availableBudgets = useMemo(() => {
    return budgets.sort((a, b) => a.name.localeCompare(b.name));
  }, [budgets]);

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

  const getGroupColor = (group: string) => {
    switch (group.toLowerCase()) {
      case "needs":
        return "bg-blue-500";
      case "wants":
        return "bg-purple-500";
      case "investment":
        return "bg-green-500";
      case "card_payment":
        return "bg-black";
      default:
        return "bg-gray-500";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

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
        amount: transaction.amount,
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
      await deleteTransactionMutation.mutateAsync(transactionToDelete.id);
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

  const handleCloseTransactionForm = () => {
    setShowTransactionForm(false);
  };

  const handleTransactionSuccess = () => {
    // Form will stay open for adding multiple transactions
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
      const deletePromises = Array.from(selectedTransactions).map((id) =>
        deleteTransactionMutation.mutateAsync(id),
      );
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

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedBudget("all");
    setSelectedCard("all");
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchTerm ||
    selectedCategory !== "all" ||
    selectedBudget !== "all" ||
    selectedCard !== "all";

  if (isLoading) {
    return <LoadingSpinner message="Loading transactions..." />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
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
    <div className="flex h-screen flex-col bg-gray-50">
      <PageHeader
        title="Transactions"
        description="Track and manage your financial transactions"
      />

      <div className="flex-1">
        <div className="mx-auto max-w-7xl px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
          {/* Overview Stats */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
            <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-4 lg:p-6">
              <div className="mb-2 flex items-center justify-between sm:mb-3 lg:mb-4">
                <h3 className="text-xs font-medium text-gray-500 sm:text-sm">
                  Total Transactions
                </h3>
                <DollarSign className="h-4 w-4 text-blue-500 sm:h-5 sm:w-5" />
              </div>
              <div className="text-lg font-bold text-gray-900 sm:text-xl lg:text-2xl">
                {stats.totalTransactions}
              </div>
              <div className="mt-1 text-xs text-gray-500">All time</div>
            </div>

            <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-4 lg:p-6">
              <div className="mb-2 flex items-center justify-between sm:mb-3 lg:mb-4">
                <h3 className="text-xs font-medium text-gray-500 sm:text-sm">
                  Total Amount
                </h3>
                <TrendingDown className="h-4 w-4 text-red-500 sm:h-5 sm:w-5" />
              </div>
              <div className="text-lg font-bold text-gray-900 sm:text-xl lg:text-2xl">
                {formatCurrency(stats.totalAmount)}
              </div>
              <div className="mt-1 text-xs text-gray-500">All time</div>
            </div>

            <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-4 lg:p-6">
              <div className="mb-2 flex items-center justify-between sm:mb-3 lg:mb-4">
                <h3 className="text-xs font-medium text-gray-500 sm:text-sm">
                  Average Transaction
                </h3>
                <TrendingUp className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
              </div>
              <div className="text-lg font-bold text-gray-900 sm:text-xl lg:text-2xl">
                {formatCurrency(stats.averageAmount)}
              </div>
              <div className="mt-1 text-xs text-gray-500">Per transaction</div>
            </div>

            <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-4 lg:p-6">
              <div className="mb-2 flex items-center justify-between sm:mb-3 lg:mb-4">
                <h3 className="text-xs font-medium text-gray-500 sm:text-sm">
                  This Month
                </h3>
                <Calendar className="h-4 w-4 text-purple-500 sm:h-5 sm:w-5" />
              </div>
              <div className="text-lg font-bold text-gray-900 sm:text-xl lg:text-2xl">
                {formatCurrency(stats.thisMonthAmount)}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {stats.thisMonthTransactions} transactions
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="mb-4 rounded-xl border bg-white p-3 shadow-sm sm:mb-6 sm:p-4 lg:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-700">Filters</h3>
              </div>
              {hasActiveFilters && (
                <Button
                  onClick={clearAllFilters}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Clear all filters
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transactions, amounts, descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Filter Row 1: Categories and Budgets */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Budget
                  </label>
                  <select
                    value={selectedBudget}
                    onChange={(e) => setSelectedBudget(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All Budgets</option>
                    <option value="no-budget">No Budget</option>
                    {availableBudgets.map((budget) => (
                      <option key={budget.id} value={budget.id}>
                        {budget.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Card
                  </label>
                  <select
                    value={selectedCard}
                    onChange={(e) => setSelectedCard(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All Cards</option>
                    <option value="no-card">No Card</option>
                    {availableCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Sort By
                  </label>
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [newSortBy, newSortOrder] = e.target.value.split(
                        "-",
                      ) as [typeof sortBy, typeof sortOrder];
                      setSortBy(newSortBy);
                      setSortOrder(newSortOrder);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="date-desc">Date (Newest)</option>
                    <option value="date-asc">Date (Oldest)</option>
                    <option value="amount-desc">Amount (High to Low)</option>
                    <option value="amount-asc">Amount (Low to High)</option>
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Add Transaction Button or Form */}
          {!showTransactionForm ? (
            filteredAndSortedTransactions.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <AddItemButton
                  onClick={() => setShowTransactionForm(true)}
                  title="Add Transaction"
                  description="Add a new transaction to your records"
                  variant="compact"
                />
              </div>
            )
          ) : (
            <div className="mb-4 sm:mb-6">
              <TransactionForm
                onClose={handleCloseTransactionForm}
                onSuccess={handleTransactionSuccess}
              />
            </div>
          )}

          {/* Bulk Actions Bar */}
          {selectedTransactions.size > 0 && (
            <div className="mb-4 rounded-xl border bg-blue-50 p-3 shadow-sm sm:mb-6 sm:p-4">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedTransactions.size} transaction
                    {selectedTransactions.size !== 1 ? "s" : ""} selected
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedTransactions(new Set())}
                    className="text-sm text-blue-600 hover:text-blue-800"
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
                    Delete Selected
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Transactions List */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b px-3 py-3 sm:px-6 sm:py-4">
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
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Select All</span>
                  </label>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Transactions ({filteredAndSortedTransactions.length})
                </h3>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
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
                        formatCurrency={formatCurrency}
                      />
                    );
                  }

                  return (
                    <div
                      key={transaction.id}
                      className="group flex items-center justify-between px-3 py-3 hover:bg-gray-50 sm:px-6 sm:py-4"
                    >
                      <div className="flex min-w-0 flex-1 items-center space-x-3 sm:space-x-4">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.has(transaction.id)}
                          onChange={() =>
                            handleSelectTransaction(transaction.id)
                          }
                          disabled={isEditing}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <div
                          className={`h-3 w-3 flex-shrink-0 rounded-full ${
                            transaction.transactionType === "CARD_PAYMENT"
                              ? getGroupColor("card_payment")
                              : transaction.category
                                ? getGroupColor(
                                    transaction.category.category.group,
                                  )
                                : "bg-gray-500"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="truncate font-medium text-gray-900">
                              {transaction.name ?? "Unnamed transaction"}
                            </h4>
                            {transaction.description && (
                              <div className="group relative flex-shrink-0">
                                <Info className="h-4 w-4 cursor-help text-gray-400" />
                                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                  {transaction.description}
                                  <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span className="truncate">
                              {transaction.transactionType === "CARD_PAYMENT"
                                ? "Card Payment"
                                : (transaction.category?.category.name ??
                                  "No Category")}
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
                        {/* Action Icons - Always visible on mobile, hover on desktop */}
                        <div className="flex items-center space-x-1 opacity-100 transition-opacity sm:space-x-2 sm:opacity-0 sm:group-hover:opacity-100">
                          <button
                            onClick={() => handleCopyTransaction(transaction)}
                            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
                            title="Copy transaction"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditTransaction(transaction)}
                            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
                            title="Edit transaction"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction)}
                            className="rounded p-1 text-red-300 transition-colors hover:bg-gray-100 hover:text-red-600"
                            title="Delete transaction"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="text-right">
                          <div
                            className={`font-medium ${
                              transaction.transactionType === "CARD_PAYMENT"
                                ? transaction.amount < 0
                                  ? "text-green-600" // Source transaction (money going out from debit card)
                                  : "text-gray-900" // Destination transaction (money being added back to credit card)
                                : transaction.amount < 0
                                  ? "text-green-600"
                                  : "text-gray-900"
                            }`}
                          >
                            {formatCurrency(transaction.amount)}
                          </div>
                          <div className="text-xs text-gray-500 sm:text-sm">
                            {new Date(
                              transaction.createdAt,
                            ).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-12 text-center sm:px-6">
                  <DollarSign className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">
                    {searchTerm ||
                    selectedCategory !== "all" ||
                    selectedBudget !== "all" ||
                    selectedCard !== "all"
                      ? "No matching transactions"
                      : "No transactions yet"}
                  </h3>
                  <p className="text-gray-500">
                    {searchTerm ||
                    selectedCategory !== "all" ||
                    selectedBudget !== "all" ||
                    selectedCard !== "all"
                      ? "Try adjusting your search or filter criteria"
                      : "Start adding transactions to see them here"}
                  </p>
                  <Button
                    onClick={() => setShowTransactionForm(true)}
                    variant="primary"
                    size="md"
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Transaction
                  </Button>
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

export default TransactionsPage;
