"use client";

import { useState, useMemo } from "react";
import { useTransactions } from "@/lib/data-hooks/transactions/useTransactions";
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
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import AddItemButton from "@/components/AddItemButton";
import type { Category } from "@prisma/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import TransactionForm from "@/components/transactions/TransactionForm";
import type { TransactionWithRelations } from "@/lib/data-hooks/services/transactions";

const TransactionsPage = () => {
  const { data: transactions = [], isLoading, error } = useTransactions();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "name">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showTransactionForm, setShowTransactionForm] = useState(false);

  // Calculate transaction statistics
  const stats = useMemo(() => {
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const averageAmount =
      totalTransactions > 0 ? totalAmount / totalTransactions : 0;
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const thisMonthTransactions = transactions.filter((t) => {
      const date = new Date(t.createdAt);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    });
    const thisMonthAmount = thisMonthTransactions.reduce(
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
      const matchesSearch =
        transaction.name?.toLowerCase().includes(searchTerm.toLowerCase()) ??
        transaction.description
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ??
        transaction.category.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" ||
        transaction.category.id === selectedCategory;

      return matchesSearch && matchesCategory;
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
  }, [transactions, searchTerm, selectedCategory, sortBy, sortOrder]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const uniqueCategories = new Map<string, Category>();
    transactions.forEach((t) => {
      if (!uniqueCategories.has(t.category.id)) {
        uniqueCategories.set(t.category.id, t.category);
      }
    });
    return Array.from(uniqueCategories.values());
  }, [transactions]);

  const getGroupColor = (group: string) => {
    switch (group.toLowerCase()) {
      case "needs":
        return "bg-blue-500";
      case "wants":
        return "bg-purple-500";
      case "investment":
        return "bg-green-500";
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

  const handleCopyTransaction = (transaction: TransactionWithRelations) => {
    console.log("Copy transaction:", transaction);
  };

  const handleEditTransaction = (transaction: TransactionWithRelations) => {
    console.log("Edit transaction:", transaction);
  };

  const handleDeleteTransaction = (transaction: TransactionWithRelations) => {
    console.log("Delete transaction:", transaction);
  };

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

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Overview Stats */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">
                  Total Transactions
                </h3>
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalTransactions}
              </div>
              <div className="mt-1 text-sm text-gray-500">All time</div>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">
                  Total Amount
                </h3>
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalAmount)}
              </div>
              <div className="mt-1 text-sm text-gray-500">All time</div>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">
                  Average Transaction
                </h3>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.averageAmount)}
              </div>
              <div className="mt-1 text-sm text-gray-500">Per transaction</div>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">
                  This Month
                </h3>
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.thisMonthAmount)}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                {stats.thisMonthTransactions} transactions
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center space-x-4">
                <div className="relative max-w-md flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSortBy, newSortOrder] = e.target.value.split(
                      "-",
                    ) as [typeof sortBy, typeof sortOrder];
                    setSortBy(newSortBy);
                    setSortOrder(newSortOrder);
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

          {/* Add Transaction Button or Form */}
          {!showTransactionForm ? (
            <div className="mb-6">
              <AddItemButton
                onClick={() => setShowTransactionForm(true)}
                title="Add Transaction"
                description="Add a new transaction to your records"
                variant="compact"
              />
            </div>
          ) : (
            <div className="mb-6">
              <TransactionForm
                onClose={() => setShowTransactionForm(false)}
                onSuccess={() => {
                  // Form will stay open for adding multiple transactions
                  // User can manually close it when done
                }}
              />
            </div>
          )}

          {/* Transactions List */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Transactions ({filteredAndSortedTransactions.length})
              </h3>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredAndSortedTransactions.length > 0 ? (
                filteredAndSortedTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="group flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`h-3 w-3 rounded-full ${getGroupColor(transaction.category.group)}`}
                      />
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {transaction.name ?? "Unnamed transaction"}
                        </h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>{transaction.category.name}</span>
                          {transaction.budget && (
                            <>
                              <span>•</span>
                              <span>{transaction.budget.name}</span>
                            </>
                          )}
                          {transaction.description && (
                            <>
                              <span>•</span>
                              <span className="max-w-xs truncate">
                                {transaction.description}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Action Icons - Only visible on hover */}
                      <div className="flex items-center space-x-2 opacity-0 transition-opacity group-hover:opacity-100">
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
                        <div className="font-medium text-gray-900">
                          {formatCurrency(transaction.amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-12 text-center">
                  <DollarSign className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">
                    {searchTerm || selectedCategory !== "all"
                      ? "No matching transactions"
                      : "No transactions yet"}
                  </h3>
                  <p className="text-gray-500">
                    {searchTerm || selectedCategory !== "all"
                      ? "Try adjusting your search or filter criteria"
                      : "Start adding transactions to see them here"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;
