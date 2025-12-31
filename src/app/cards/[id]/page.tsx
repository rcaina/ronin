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
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import PageHeader from "@/components/PageHeader";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import AddCardForm from "@/components/cards/AddCardForm";
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

interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: string;
}

const CardDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const { data: card, isLoading: cardLoading, error: cardError } = useCard(id);
  const { data: transactions = [], isLoading: transactionsLoading } =
    useCardTransactions(id);
  const { data: budgets = [] } = useBudgets();
  const deleteCardMutation = useDeleteCard();
  const updateCardMutation = useUpdateCard();

  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showCardPaymentModal, setShowCardPaymentModal] = useState(false);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);

  // Map API card to component card
  const mappedCard: Card | null = card ? mapApiCardToCard(card) : null;

  // Fetch users for the account
  const fetchUsers = async () => {
    setLoadingUsers(true);
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
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch users when component mounts or when editing starts
  useState(() => {
    if (session && isEditing) {
      void fetchUsers();
    }
  });

  const handleEditCard = () => {
    setIsEditing(true);
    void fetchUsers();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
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

      if (id) {
        await updateCardMutation.mutateAsync({
          id: id,
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

  if (cardLoading) {
    return <LoadingSpinner message="Loading card details..." />;
  }

  if (cardError || !card || !mappedCard) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-lg text-red-500">
          {cardError instanceof Error
            ? cardError.message
            : "Failed to load card"}
        </span>
      </div>
    );
  }

  const totalSpent = mappedCard.amountSpent;
  const availableCredit =
    mappedCard.type === "credit" || mappedCard.type === "business_credit"
      ? (mappedCard.spendingLimit ?? 0) - totalSpent
      : (mappedCard.spendingLimit ?? 0) + totalSpent;
  const utilizationRate = mappedCard.spendingLimit
    ? (totalSpent / mappedCard.spendingLimit) * 100
    : 0;

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <PageHeader
        title={card.name}
        description={`${card.cardType.toLowerCase().replace("_", " ")} card details`}
        backButton={{
          onClick: () => {
            // Use a more reliable navigation method for mobile
            if (window.history.length > 1) {
              window.history.back();
            } else {
              // Fallback to cards list if no history
              router.push("/cards");
            }
          },
        }}
        actions={[
          {
            label: "Add Transaction",
            onClick: () => setShowAddTransactionModal(true),
            icon: <Plus className="h-4 w-4" />,
          },
          ...(card.cardType === CardType.CREDIT ||
          card.cardType === CardType.BUSINESS_CREDIT
            ? [
                {
                  label: "Pay Credit Card",
                  onClick: () => setShowCardPaymentModal(true),
                  icon: <CreditCard className="h-4 w-4" />,
                },
              ]
            : []),
        ]}
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
          {/* Card Details Section */}
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Card Details
              </h2>
              <div className="flex gap-2">
                <Button onClick={handleEditCard} variant="secondary" size="sm">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button onClick={handleDeleteCard} variant="danger" size="sm">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>

            {isEditing && (
              <AddCardForm
                onSubmit={handleSubmitCard}
                onCancel={handleCancelEdit}
                isLoading={updateCardMutation.isPending}
                cardToEdit={card}
                users={users}
                loadingUsers={loadingUsers}
                defaultValues={{
                  name: card.name,
                  cardType: card.cardType,
                  spendingLimit: card.spendingLimit?.toString() ?? "",
                  userId: card.userId,
                }}
              />
            )}
          </div>

          {/* Card Stats */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
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
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Card Information
            </h3>
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
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-sm text-gray-500">
                    {new Date(card.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Section */}
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Recent Transactions
              </h2>
              <Button
                onClick={() => setShowAddTransactionModal(true)}
                variant="primary"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Add Transaction
              </Button>
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
                <Button
                  onClick={() => setShowAddTransactionModal(true)}
                  variant="primary"
                >
                  <Plus className="h-4 w-4" />
                  Add Transaction
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.slice(0, 10).map((transaction) => (
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
                          {transaction.transactionType ===
                          TransactionType.INCOME ? (
                            <p className="text-sm font-medium text-green-600">
                              Income
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500">
                              {transaction.category?.name ?? "Uncategorized"}
                            </p>
                          )}
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
                                  : // For debit cards: returns are green, regular transactions are red
                                    card.cardType === CardType.DEBIT ||
                                      card.cardType ===
                                        CardType.BUSINESS_DEBIT ||
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
                                : // For debit cards: returns are positive, regular transactions are negative
                                  card.cardType === CardType.DEBIT ||
                                    card.cardType === CardType.BUSINESS_DEBIT ||
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
                ))}
                {transactions.length > 10 && (
                  <div className="text-center">
                    <Button
                      onClick={() => router.push(`/transactions?card=${id}`)}
                      variant="secondary"
                    >
                      View All Transactions
                    </Button>
                  </div>
                )}
              </div>
            )}
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
        cardId={id ?? ""}
        onClose={() => setShowAddTransactionModal(false)}
        onSuccess={handleTransactionSuccess}
      />

      {/* Card Payment Modal */}
      <CardPaymentModal
        isOpen={showCardPaymentModal}
        onClose={() => setShowCardPaymentModal(false)}
        currentCardId={id ?? ""}
      />
    </div>
  );
};

export default CardDetailsPage;
