"use client";

import {
  CreditCard,
  DollarSign,
  Calendar,
  User,
  Edit,
  Trash2,
  Plus,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import { CardPaymentModal } from "@/components/transactions/CardPaymentModal";
import {
  useCard,
  useCardTransactions,
  useDeleteCard,
  useUpdateCard,
} from "@/lib/data-hooks/cards/useCards";
import { useBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import { mapApiCardToCard, type Card } from "@/lib/utils/cards";
import LoadingSpinner from "@/components/LoadingSpinner";
import Button from "@/components/Button";
import { CardType, TransactionType } from "@prisma/client";
import StatsCard from "@/components/StatsCard";
import {
  useBudgetHeader,
  type HeaderAction,
} from "../../../../../../components/budgets/BudgetHeaderContext";

interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: string;
}

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
        label: "Add Transaction",
        onClick: handleOpenAddTransactionModal,
        variant: "primary",
      },
      {
        icon: <Trash2 className="h-4 w-4" />,
        label: "Delete Card",
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
        label: "Pay Credit Card",
        onClick: handleOpenCardPaymentModal,
        variant: "secondary",
      });
    }

    setActions(actions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, isCardOwner, setActions]);

  if (cardLoading) {
    return <LoadingSpinner message="Loading card details..." />;
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
      <div className="h-full flex-1 overflow-y-auto">
        <div>
          <div className="mx-auto w-full px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-4">
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
            <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
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

              {transactionsLoading ? (
                <LoadingSpinner message="Loading transactions..." />
              ) : transactions.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white py-12 text-center">
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
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {transaction.name ?? "Unnamed Transaction"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {transaction.category?.name ?? "Uncategorized"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className={`font-semibold ${
                                transaction.transactionType ===
                                  TransactionType.CARD_PAYMENT ||
                                transaction.transactionType ===
                                  TransactionType.RETURN
                                  ? "text-red-600" // Always red for card payments and returns
                                  : transaction.amount >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                              }`}
                            >
                              {transaction.transactionType ===
                                TransactionType.CARD_PAYMENT ||
                              transaction.transactionType ===
                                TransactionType.RETURN
                                ? "-$" // Always negative for card payments and returns
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
                  ))}
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
    </>
  );
};

export default CardDetailsPage;
