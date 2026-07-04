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
import { formatCurrency } from "@/lib/utils";
import { useBackNavigation } from "@/lib/utils/navigation-history";
import { getCardTransactionDisplay } from "@/lib/utils/transactions";
import { usePageLoading } from "@/components/ConditionalLayout";
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
  // Pure scoped history with no scope prefix: this page is reachable from
  // many places (the cards list, a budget's cards tab, another card), and
  // going back to wherever the user actually came from is correct here.
  // Falls back to the cards list when there's no tracked previous page.
  const handleBack = useBackNavigation("/cards");
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

  const isPageLoading = cardLoading || transactionsLoading;
  usePageLoading(isPageLoading, "Loading card details...");
  if (isPageLoading) {
    return null;
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

  const isCreditCard =
    card.cardType === CardType.CREDIT ||
    card.cardType === CardType.BUSINESS_CREDIT;
  const totalSpent = mappedCard.amountSpent;
  // For credit cards the limit is the credit line; for debit/cash cards it is
  // the income deposited on the card. Either way, available = limit - spent.
  const availableAmount = (mappedCard.spendingLimit ?? 0) - totalSpent;
  const utilizationRate = mappedCard.spendingLimit
    ? (totalSpent / mappedCard.spendingLimit) * 100
    : 0;

  return (
    <div className="flex flex-col bg-surface lg:h-screen">
      <PageHeader
        title={card.name}
        description={`${card.cardType.toLowerCase().replace("_", " ")} card details`}
        backButton={{ onClick: handleBack }}
        actions={[
          {
            label: "Add transaction",
            onClick: () => setShowAddTransactionModal(true),
            icon: <Plus className="h-4 w-4" />,
          },
          ...(card.cardType === CardType.CREDIT ||
          card.cardType === CardType.BUSINESS_CREDIT
            ? [
                {
                  label: "Pay credit card",
                  onClick: () => setShowCardPaymentModal(true),
                  icon: <CreditCard className="h-4 w-4" />,
                },
              ]
            : []),
        ]}
      />

      <div className="pt-4 lg:flex-1 lg:overflow-auto lg:pt-0">
        <div className="mx-auto px-2 py-4 pb-28 sm:px-4 sm:py-6 sm:pb-28 lg:px-8 lg:py-8 lg:pb-8">
          {/* Card Details Section */}
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                Card details
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
              title="Total spent"
              value={formatCurrency(totalSpent)}
              subtitle="All time"
              icon={
                <DollarSign className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />
              }
              iconColor="text-green-600"
            />

            {mappedCard.spendingLimit && (
              <>
                <StatsCard
                  title={isCreditCard ? "Available credit" : "Available funds"}
                  value={formatCurrency(availableAmount)}
                  subtitle={`${utilizationRate.toFixed(1)}% utilized`}
                  icon={
                    <CreditCard className="h-4 w-4 text-secondary-600 sm:h-5 sm:w-5" />
                  }
                  iconColor="text-secondary-600"
                />

                <StatsCard
                  title={isCreditCard ? "Credit limit" : "Total income"}
                  value={formatCurrency(mappedCard.spendingLimit)}
                  subtitle={isCreditCard ? "Total limit" : "Deposited on card"}
                  icon={
                    <CreditCard className="h-4 w-4 text-secondary-600 sm:h-5 sm:w-5" />
                  }
                  iconColor="text-secondary-600"
                />
              </>
            )}

            <StatsCard
              title="Transactions"
              value={transactions.length}
              subtitle="Total transactions"
              icon={
                <Calendar className="h-4 w-4 text-secondary-600 sm:h-5 sm:w-5" />
              }
              iconColor="text-secondary-600"
            />
          </div>

          {/* Card Info */}
          <div className="card-surface mb-6 p-4 sm:p-5">
            <h3 className="mb-4 text-lg font-semibold tracking-tight text-gray-900">
              Card information
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
              <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                Recent transactions
              </h2>
              <Button
                onClick={() => setShowAddTransactionModal(true)}
                variant="primary"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Add transaction
              </Button>
            </div>

            {transactions.length === 0 ? (
              <div className="card-surface flex flex-col items-center gap-3 p-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
                  <Calendar className="h-7 w-7" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-gray-900">
                  No transactions yet
                </h3>
                <p className="text-sm text-gray-500">
                  Add your first transaction to this card to get started
                </p>
                <Button
                  onClick={() => setShowAddTransactionModal(true)}
                  variant="primary"
                >
                  <Plus className="h-4 w-4" />
                  Add transaction
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.slice(0, 10).map((transaction) => {
                  const amountDisplay = getCardTransactionDisplay(
                    transaction.transactionType,
                    card.cardType,
                  );
                  return (
                    <div
                      key={transaction.id}
                      className="card-surface flex items-center justify-between p-4"
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
                              className={`font-semibold tabular-nums ${amountDisplay.colorClass}`}
                            >
                              {amountDisplay.prefix}
                              {formatCurrency(Math.abs(transaction.amount))}
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
                  );
                })}
                {transactions.length > 10 && (
                  <div className="text-center">
                    <Button
                      onClick={() => router.push(`/transactions?card=${id}`)}
                      variant="secondary"
                    >
                      View all transactions
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
