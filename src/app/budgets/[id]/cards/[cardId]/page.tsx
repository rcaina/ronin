"use client";

import {
  CreditCard,
  DollarSign,
  Calendar,
  User,
  Edit,
  Pencil,
  Trash2,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import { CardPaymentModal } from "@/components/transactions/CardPaymentModal";
import InlineTransactionEdit from "@/components/transactions/InlineTransactionEdit";
import SwipeableRow from "@/components/SwipeableRow";
import Modal from "@/components/Modal";
import {
  useCard,
  useCardTransactions,
  useDeleteCard,
  useUpdateCard,
} from "@/lib/data-hooks/cards/useCards";
import { useBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import { useDeleteTransaction } from "@/lib/data-hooks/transactions/useTransactions";
import { isDebitCard, mapApiCardToCard, type Card } from "@/lib/utils/cards";
import { usePageLoading } from "@/components/ConditionalLayout";
import Button from "@/components/Button";
import { CardType, TransactionType } from "@prisma/client";
import StatsCard from "@/components/StatsCard";
import {
  useBudgetHeader,
  type HeaderAction,
} from "../../../../../../components/budgets/BudgetHeaderContext";
import type { TransactionWithRelations } from "@/lib/types/transaction";
import { getGroupColor } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: string;
}

type CardTransactionSortBy = "date" | "amount" | "name";
type CardTransactionSortOrder = "asc" | "desc";

interface CardTransactionFilterValues {
  filterType: TransactionType | "all";
  sortBy: CardTransactionSortBy;
  sortOrder: CardTransactionSortOrder;
}

const DEFAULT_CARD_TRANSACTION_FILTERS: CardTransactionFilterValues = {
  filterType: "all",
  sortBy: "date",
  sortOrder: "desc",
};

const FILTER_SELECT_CLASSES =
  "w-full rounded-xl border border-gray-300 bg-surface-card px-3 py-2 text-sm text-gray-900 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary";

interface CardTransactionFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  values: CardTransactionFilterValues;
  onApply: (values: CardTransactionFilterValues) => void;
  onClear: () => void;
}

const CardTransactionFiltersModal = ({
  isOpen,
  onClose,
  values,
  onApply,
  onClear,
}: CardTransactionFiltersModalProps) => {
  const [draft, setDraft] = useState<CardTransactionFilterValues>(values);

  // Keep the latest committed values around without making them a dependency
  // of the seed effect below (they can change identity on every render).
  const valuesRef = useRef(values);
  valuesRef.current = values;

  // Seed the draft from the currently applied filters every time the modal
  // opens. Editing controls only ever updates the draft; closing without
  // saving simply discards it.
  useEffect(() => {
    if (isOpen) {
      setDraft(valuesRef.current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClear = () => {
    setDraft(DEFAULT_CARD_TRANSACTION_FILTERS);
    onClear();
    onClose();
  };

  const handleSave = () => {
    onApply(draft);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="sheet"
      title="Filters"
      footer={
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleClear} className="flex-1">
            Clear
          </Button>
          <Button variant="primary" onClick={handleSave} className="flex-1">
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Transaction type
          </label>
          <select
            value={draft.filterType}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                filterType: e.target.value as TransactionType | "all",
              }))
            }
            className={FILTER_SELECT_CLASSES}
          >
            <option value="all">All types</option>
            <option value={TransactionType.REGULAR}>Regular</option>
            <option value={TransactionType.RETURN}>Return</option>
            <option value={TransactionType.INCOME}>Income</option>
            <option value={TransactionType.CARD_PAYMENT}>Card payment</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Sort by
          </label>
          <select
            value={`${draft.sortBy}-${draft.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split("-") as [
                CardTransactionSortBy,
                CardTransactionSortOrder,
              ];
              setDraft((d) => ({ ...d, sortBy, sortOrder }));
            }}
            className={FILTER_SELECT_CLASSES}
          >
            <option value="date-desc">Date (newest)</option>
            <option value="date-asc">Date (oldest)</option>
            <option value="amount-desc">Amount (high to low)</option>
            <option value="amount-asc">Amount (low to high)</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
          </select>
        </div>
      </div>
    </Modal>
  );
};

const CardDetailsPage = () => {
  const params = useParams<{ id: string; cardId: string }>();
  const cardId = params.cardId;
  const router = useRouter();
  const { data: session } = useSession();

  const {
    data: card,
    isLoading: cardLoading,
    error: cardError,
  } = useCard(cardId);
  const { data: transactions = [], isLoading: transactionsLoading } =
    useCardTransactions(cardId);
  const { data: budgets = [] } = useBudgets();
  const deleteCardMutation = useDeleteCard();
  const updateCardMutation = useUpdateCard();
  const { setActions, setTitle, setDescription } = useBudgetHeader();

  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showCardPaymentModal, setShowCardPaymentModal] = useState(false);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);
  const [transactionToDelete, setTransactionToDelete] =
    useState<TransactionWithRelations | null>(null);
  const deleteTransactionMutation = useDeleteTransaction();

  // Search/filter/sort for the transaction list below.
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<TransactionType | "all">(
    DEFAULT_CARD_TRANSACTION_FILTERS.filterType,
  );
  const [sortBy, setSortBy] = useState<CardTransactionSortBy>(
    DEFAULT_CARD_TRANSACTION_FILTERS.sortBy,
  );
  const [sortOrder, setSortOrder] = useState<CardTransactionSortOrder>(
    DEFAULT_CARD_TRANSACTION_FILTERS.sortOrder,
  );
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Form state for editing
  const [editFormData, setEditFormData] = useState({
    name: "",
    cardType: CardType.CASH as CardType,
    spendingLimit: "",
    userId: "",
  });

  // Map API card to component card
  const mappedCard: Card | null = card ? mapApiCardToCard(card) : null;

  // Check if current user owns this card
  const isCardOwner = card?.userId === session?.user?.id;

  // Fetch users for the account
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const usersData = (await response.json()) as User[];
      setUsers(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Failed to load users. Please refresh the page.");
    }
  };

  // Fetch users when component mounts or when editing starts
  useEffect(() => {
    if (session && isEditing) {
      void fetchUsers();
    }
  }, [session, isEditing]);

  const handleEditCard = () => {
    if (!isCardOwner || !card) {
      toast.error("You can only edit cards that you own.");
      return;
    }
    setIsEditing(true);
    setEditFormData({
      name: card.name,
      cardType: card.cardType,
      spendingLimit: card.spendingLimit?.toString() ?? "",
      userId: card.userId,
    });
    void fetchUsers();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditFormData({
      name: "",
      cardType: CardType.CASH as CardType,
      spendingLimit: "",
      userId: "",
    });
  };

  const handleSubmitCard = async (data: {
    name: string;
    cardType: CardType;
    spendingLimit?: string;
    userId: string;
  }) => {
    try {
      const cardData = {
        ...data,
        spendingLimit:
          data.spendingLimit === "" || data.spendingLimit === undefined
            ? undefined
            : Number(data.spendingLimit),
        cardType: data.cardType,
      };

      if (cardId) {
        await updateCardMutation.mutateAsync({
          id: cardId,
          data: cardData,
        });
      }
      setIsEditing(false);
      toast.success("Card updated successfully!");
    } catch (err) {
      console.error("Failed to save card:", err);
      toast.error("Failed to save card. Please try again.");
    }
  };

  const handleDeleteCard = () => {
    if (!isCardOwner) {
      toast.error("You can only delete cards that you own.");
      return;
    }
    if (mappedCard) {
      setCardToDelete(mappedCard);
    }
  };

  const handleConfirmDelete = async () => {
    if (!cardToDelete) return;

    try {
      await deleteCardMutation.mutateAsync(cardToDelete.id);
      setCardToDelete(null);
      toast.success("Card deleted successfully!");
      router.push("/cards");
    } catch (err) {
      console.error("Failed to delete card:", err);
      toast.error("Failed to delete card. Please try again.");
    }
  };

  const handleCancelDelete = () => {
    setCardToDelete(null);
  };

  const handleTransactionSuccess = () => {
    setShowAddTransactionModal(false);
    toast.success("Transaction added successfully!");
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

  const handleConfirmDeleteTransaction = async () => {
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

  const handleCancelDeleteTransaction = () => {
    setTransactionToDelete(null);
  };

  const handleInlineEditCancel = () => {
    setEditingTransactionId(null);
  };

  const handleInlineEditSuccess = () => {
    setEditingTransactionId(null);
  };

  const handleOpenAddTransactionModal = () => {
    if (!isCardOwner) {
      toast.error("You can only add transactions to cards that you own.");
      return;
    }
    setShowAddTransactionModal(true);
  };

  const handleOpenCardPaymentModal = () => {
    if (!isCardOwner) {
      toast.error("You can only make payments on cards that you own.");
      return;
    }
    setShowCardPaymentModal(true);
  };

  // Set title and description
  useEffect(() => {
    if (card) {
      setTitle(card.name);
      setDescription(
        `${card.cardType.toLowerCase().replace("_", " ")} card details`,
      );
    }
  }, [card, setTitle, setDescription]);

  // Register header actions
  useEffect(() => {
    if (!card || !isCardOwner) {
      setActions([]);
      return;
    }

    const actions: HeaderAction[] = [
      {
        icon: <Plus className="h-4 w-4" />,
        label: "Add transaction",
        onClick: handleOpenAddTransactionModal,
        variant: "primary",
      },
      {
        icon: <Trash2 className="h-4 w-4" />,
        label: "Delete card",
        onClick: handleDeleteCard,
        variant: "danger",
      },
    ];

    // Add Pay Credit Card button if it's a credit card
    if (
      card.cardType === CardType.CREDIT ||
      card.cardType === CardType.BUSINESS_CREDIT
    ) {
      actions.push({
        icon: <CreditCard className="h-4 w-4" />,
        label: "Pay credit card",
        onClick: handleOpenCardPaymentModal,
        variant: "secondary",
      });
    }

    setActions(actions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, isCardOwner, setActions]);

  // Search/filter/sort the card's transactions for the list below. Search
  // matches transaction name and description.
  const filteredAndSortedTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = transactions.filter((transaction) => {
      const matchesSearch =
        query === "" ||
        (transaction.name?.toLowerCase().includes(query) ?? false) ||
        (transaction.description?.toLowerCase().includes(query) ?? false);
      const matchesType =
        filterType === "all" || transaction.transactionType === filterType;
      return matchesSearch && matchesType;
    });

    return [...filtered].sort((a, b) => {
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
  }, [transactions, searchQuery, filterType, sortBy, sortOrder]);

  const activeFilterCount =
    (filterType !== "all" ? 1 : 0) +
    (sortBy !== DEFAULT_CARD_TRANSACTION_FILTERS.sortBy ||
    sortOrder !== DEFAULT_CARD_TRANSACTION_FILTERS.sortOrder
      ? 1
      : 0);

  const currentFilterValues: CardTransactionFilterValues = {
    filterType,
    sortBy,
    sortOrder,
  };

  const handleApplyFilters = (newValues: CardTransactionFilterValues) => {
    setFilterType(newValues.filterType);
    setSortBy(newValues.sortBy);
    setSortOrder(newValues.sortOrder);
  };

  const handleClearFilters = () => {
    setFilterType(DEFAULT_CARD_TRANSACTION_FILTERS.filterType);
    setSortBy(DEFAULT_CARD_TRANSACTION_FILTERS.sortBy);
    setSortOrder(DEFAULT_CARD_TRANSACTION_FILTERS.sortOrder);
  };

  const isPageLoading = cardLoading || transactionsLoading;
  usePageLoading(isPageLoading, "Loading card details...");
  if (isPageLoading) {
    return null;
  }

  if (cardError || !card || !mappedCard) {
    console.error("CardDetailsPage error:", { cardError, card, mappedCard });
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <span className="text-lg text-red-500">
            {cardError instanceof Error
              ? cardError.message
              : "Failed to load card"}
          </span>
          <div className="mt-2 text-sm text-gray-500">Card ID: {cardId}</div>
          <div className="mt-2 text-sm text-gray-500">
            Session: {session ? "Authenticated" : "Not authenticated"}
          </div>
        </div>
      </div>
    );
  }

  const totalSpent = mappedCard.amountSpent;
  const availableCredit =
    card.cardType === CardType.CREDIT ||
    card.cardType === CardType.BUSINESS_CREDIT
      ? (mappedCard.spendingLimit ?? 0) - totalSpent
      : (mappedCard.spendingLimit ?? 0) + totalSpent;
  const utilizationRate = mappedCard.spendingLimit
    ? (totalSpent / mappedCard.spendingLimit) * 100
    : 0;

  return (
    <>
      <div className="lg:h-full lg:flex-1 lg:overflow-y-auto">
        <div>
          <div className="mx-auto w-full px-2 py-4 pb-28 sm:px-4 sm:py-6 lg:px-8 lg:py-4 lg:pb-8">
            {/* Card Stats */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
              <StatsCard
                title="Total Spent"
                value={`$${totalSpent.toLocaleString()}`}
                subtitle="All time"
                icon={
                  <DollarSign className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
                }
                iconColor="text-green-500"
              />

              {mappedCard.spendingLimit && (
                <>
                  <StatsCard
                    title="Available Credit"
                    value={`$${availableCredit.toLocaleString()}`}
                    subtitle={`${utilizationRate.toFixed(1)}% utilized`}
                    icon={
                      <CreditCard className="h-4 w-4 text-blue-500 sm:h-5 sm:w-5" />
                    }
                    iconColor="text-blue-500"
                  />

                  <StatsCard
                    title="Credit Limit"
                    value={`$${mappedCard.spendingLimit.toLocaleString()}`}
                    subtitle="Total limit"
                    icon={
                      <CreditCard className="h-4 w-4 text-indigo-500 sm:h-5 sm:w-5" />
                    }
                    iconColor="text-indigo-500"
                  />
                </>
              )}

              <StatsCard
                title="Transactions"
                value={transactions.length}
                subtitle="Total transactions"
                icon={
                  <Calendar className="h-4 w-4 text-purple-500 sm:h-5 sm:w-5" />
                }
                iconColor="text-purple-500"
              />
            </div>

            {/* Card Info */}
            <div className="mb-6 rounded-xl border bg-surface-card p-4 shadow-sm">
              <h3 className="mb-4 flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">
                  Card Information
                </span>
                {isCardOwner && (
                  <button
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      handleEditCard();
                    }}
                    title="Edit"
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
              </h3>

              {isEditing && isCardOwner ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Card Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.name}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter card name"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Card Type
                      </label>
                      <select
                        value={editFormData.cardType}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            cardType: e.target.value as CardType,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value={CardType.CASH}>Cash</option>
                        <option value={CardType.DEBIT}>Debit</option>
                        <option value={CardType.CREDIT}>Credit</option>
                        <option value={CardType.BUSINESS_DEBIT}>
                          Business Debit
                        </option>
                        <option value={CardType.BUSINESS_CREDIT}>
                          Business Credit
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Spending Limit
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editFormData.spendingLimit}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            spendingLimit: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter spending limit"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Owner
                      </label>
                      <select
                        value={editFormData.userId}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            userId: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      onClick={handleCancelEdit}
                      variant="secondary"
                      size="sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        void handleSubmitCard(editFormData);
                      }}
                      variant="primary"
                      size="sm"
                      isLoading={updateCardMutation.isPending}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Type</p>
                      <p className="text-sm capitalize text-gray-500">
                        {card.cardType.toLowerCase().replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Owner</p>
                      <p className="text-sm text-gray-500">{card.user.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Created
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(card.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Transactions Section */}
            <div className="mb-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Transactions
                </h2>
              </div>

              {transactions.length > 0 && (
                <div className="mb-4">
                  {/* Below lg: search + filter icon that opens the filters sheet. */}
                  <div className="flex items-center gap-2 lg:hidden">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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
                      {activeFilterCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-semibold text-primary-950">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* At lg+: keep the inline filter/sort selects, plus search. */}
                  <div className="hidden items-center gap-3 lg:flex">
                    <div className="relative max-w-xs flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-surface-card py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                      />
                    </div>
                    <select
                      value={filterType}
                      onChange={(e) =>
                        setFilterType(e.target.value as TransactionType | "all")
                      }
                      className={FILTER_SELECT_CLASSES.replace(
                        "w-full",
                        "w-auto",
                      )}
                      aria-label="Filter by transaction type"
                    >
                      <option value="all">All types</option>
                      <option value={TransactionType.REGULAR}>Regular</option>
                      <option value={TransactionType.RETURN}>Return</option>
                      <option value={TransactionType.INCOME}>Income</option>
                      <option value={TransactionType.CARD_PAYMENT}>
                        Card payment
                      </option>
                    </select>
                    <select
                      value={`${sortBy}-${sortOrder}`}
                      onChange={(e) => {
                        const [newSortBy, newSortOrder] = e.target.value.split(
                          "-",
                        ) as [CardTransactionSortBy, CardTransactionSortOrder];
                        setSortBy(newSortBy);
                        setSortOrder(newSortOrder);
                      }}
                      className={FILTER_SELECT_CLASSES.replace(
                        "w-full",
                        "w-auto",
                      )}
                      aria-label="Sort transactions"
                    >
                      <option value="date-desc">Date (newest)</option>
                      <option value="date-asc">Date (oldest)</option>
                      <option value="amount-desc">Amount (high to low)</option>
                      <option value="amount-asc">Amount (low to high)</option>
                      <option value="name-asc">Name (A-Z)</option>
                      <option value="name-desc">Name (Z-A)</option>
                    </select>
                  </div>
                </div>
              )}

              {transactions.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-surface-card py-12 text-center">
                  <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">
                    No transactions yet
                  </h3>
                  <p className="mb-6 text-sm text-gray-500">
                    Add your first transaction to this card to get started
                  </p>
                  {isCardOwner && (
                    <Button
                      onClick={handleOpenAddTransactionModal}
                      variant="primary"
                    >
                      <Plus className="h-4 w-4" />
                      Add Transaction
                    </Button>
                  )}
                </div>
              ) : filteredAndSortedTransactions.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-surface-card py-12 text-center">
                  <Search className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">
                    No matching transactions
                  </h3>
                  <p className="text-sm text-gray-500">
                    Try adjusting your search or filters.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAndSortedTransactions.map((transaction) => {
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
                        className="rounded-lg"
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
                        <div className="group flex items-center justify-between rounded-lg border bg-surface-card p-4 shadow-sm hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  {transaction.name ?? "Unnamed Transaction"}
                                </p>
                                {transaction.transactionType ===
                                TransactionType.INCOME ? (
                                  <p className="text-sm font-medium text-green-600">
                                    Income
                                  </p>
                                ) : (
                                  <p className="text-sm text-gray-500">
                                    {transaction.category?.name ??
                                      "Uncategorized"}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Action Icons — desktop hover only; mobile
                                  exposes them via swipe (SwipeableRow). */}
                                <div className="hidden items-center space-x-1 opacity-0 transition-opacity lg:flex lg:group-hover:opacity-100">
                                  <button
                                    onClick={() =>
                                      handleEditTransaction(transaction)
                                    }
                                    className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
                                    title="Edit transaction"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteTransaction(transaction)
                                    }
                                    className="rounded p-1 text-red-300 transition-colors hover:bg-gray-100 hover:text-red-600"
                                    title="Delete transaction"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="text-right">
                                  <p
                                    className={`font-semibold ${
                                      transaction.transactionType ===
                                      TransactionType.INCOME
                                        ? "text-green-600" // Income transactions are always green
                                        : transaction.transactionType ===
                                            TransactionType.CARD_PAYMENT
                                          ? "text-red-600" // Always red for card payments
                                          : // For debit (and cash) cards: returns are green, regular transactions are red
                                            isDebitCard(card) ||
                                              card.cardType === CardType.CASH
                                            ? transaction.transactionType ===
                                              TransactionType.RETURN
                                              ? "text-green-600" // Returns are green for debit cards
                                              : "text-red-600" // Regular transactions are red for debit cards
                                            : transaction.transactionType ===
                                                TransactionType.RETURN
                                              ? "text-green-600"
                                              : "text-red-600"
                                    }`}
                                  >
                                    {transaction.transactionType ===
                                    TransactionType.INCOME
                                      ? "+$" // Income transactions are always positive
                                      : transaction.transactionType ===
                                          TransactionType.CARD_PAYMENT
                                        ? "-$" // Always negative for card payments
                                        : // For debit (and cash) cards: returns are positive, regular transactions are negative
                                          isDebitCard(card) ||
                                            card.cardType === CardType.CASH
                                          ? transaction.transactionType ===
                                            TransactionType.RETURN
                                            ? "+$" // Returns are positive for debit cards
                                            : "-$" // Regular transactions are negative for debit cards
                                          : transaction.amount >= 0
                                            ? "+$"
                                            : "$"}
                                    {Math.abs(transaction.amount).toFixed(2)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(
                                      transaction.createdAt,
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </SwipeableRow>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!cardToDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Card"
        message={`Are you sure you want to delete "${cardToDelete?.name ?? ""}"? This action cannot be undone.`}
        itemName={cardToDelete?.name ?? ""}
        isLoading={deleteCardMutation.isPending}
        confirmText="Delete Card"
      />

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={showAddTransactionModal}
        budgetId={budgets[0]?.id ?? ""} // Use first budget or empty string
        cardId={cardId ?? ""}
        onClose={() => setShowAddTransactionModal(false)}
        onSuccess={handleTransactionSuccess}
      />

      {/* Card Payment Modal */}
      <CardPaymentModal
        isOpen={showCardPaymentModal}
        onClose={() => setShowCardPaymentModal(false)}
        currentCardId={cardId ?? ""}
      />

      {/* Delete Transaction Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!transactionToDelete}
        onClose={handleCancelDeleteTransaction}
        onConfirm={handleConfirmDeleteTransaction}
        title="Delete Transaction"
        message="Are you sure you want to delete the transaction '{itemName}'? This action cannot be undone."
        itemName={transactionToDelete?.name ?? "Unnamed transaction"}
        isLoading={deleteTransactionMutation.isPending}
        loadingText="Deleting..."
        confirmText="Delete Transaction"
        cancelText="Cancel"
      />

      {/* Transaction Filters Modal (mobile) */}
      <CardTransactionFiltersModal
        isOpen={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        values={currentFilterValues}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />
    </>
  );
};

export default CardDetailsPage;
