"use client";

import {
  Plus,
  CreditCard,
  DollarSign,
  Shield,
  AlertCircle,
  Target,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { default as CardComponent } from "@/components/cards/Card";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import AddCardForm from "@/components/cards/AddCardForm";
import { CardPaymentModal } from "@/components/transactions/CardPaymentModal";
import {
  useDeleteCard,
  useCreateCard,
  useUpdateCard,
} from "@/lib/data-hooks/cards/useCards";
import { useBudgetCards } from "@/lib/data-hooks/budgets/useBudgetCards";
import LoadingSpinner from "@/components/LoadingSpinner";
import { type CardType } from "@prisma/client";
import Button from "@/components/Button";
import { type Card, mapCardType, getCardColor } from "@/lib/utils/cards";
import StatsCard from "@/components/StatsCard";
import type { Card as PrismaCard } from "@prisma/client";
import { useBudget } from "@/lib/data-hooks/budgets/useBudget";
import { useBudgetHeader } from "../../../../../components/budgets/BudgetHeaderContext";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";

// Interface for budget cards with user information
interface BudgetCard extends PrismaCard {
  user: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
  };
  amountSpent: number;
}

interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: string;
}

const BudgetCardsPage = () => {
  const router = useRouter();
  const params = useParams();
  const budgetId = params.id as string;
  const { data: session } = useSession();
  const {
    data: budget,
    isLoading: budgetLoading,
    error: budgetError,
  } = useBudget(budgetId);
  const {
    data: apiCards,
    isLoading: cardsLoading,
    error: cardsError,
  } = useBudgetCards(budgetId);
  const deleteCardMutation = useDeleteCard();
  const createCardMutation = useCreateCard();
  const updateCardMutation = useUpdateCard();
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<BudgetCard | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showCardPaymentModal, setShowCardPaymentModal] = useState(false);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const { setActions } = useBudgetHeader();

  // Register header actions
  useEffect(() => {
    setActions([
      {
        icon: <Plus className="h-4 w-4" />,
        label: "Add Transaction",
        onClick: () => setShowAddTransactionModal(true),
        variant: "primary" as const,
      },
      {
        icon: <DollarSign className="h-4 w-4" />,
        label: "Pay Credit Card",
        onClick: () => setShowCardPaymentModal(true),
        variant: "secondary" as const,
      },
      {
        icon: <CreditCard className="h-4 w-4" />,
        label: "Add Card",
        onClick: () => setShowAddCardModal(true),
        variant: "secondary" as const,
      },
    ]);
  }, [setActions]);

  // Map Prisma cards to component cards
  const cards: Card[] = useMemo(() => {
    if (!apiCards) return [];

    return apiCards.map((prismaCard: BudgetCard) => ({
      id: prismaCard.id,
      name: prismaCard.name,
      type: mapCardType(prismaCard.cardType),
      amountSpent: prismaCard.amountSpent ?? 0,
      spendingLimit: prismaCard.spendingLimit ?? undefined,
      userId: prismaCard.userId,
      user: prismaCard.user?.name ?? "Unknown User",
      isActive: !prismaCard.deleted,
      color: getCardColor(prismaCard.userId),
    }));
  }, [apiCards]);

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

  // Fetch users when component mounts
  useEffect(() => {
    if (session) {
      void fetchUsers();
    }
  }, [session]);

  const handleAddCard = () => {
    setShowAddCardModal(true);
    setCardToEdit(null);
  };

  const handleCancelAdd = () => {
    setShowAddCardModal(false);
  };

  const handleCancelEdit = () => {
    setCardToEdit(null);
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

      if (cardToEdit) {
        await updateCardMutation.mutateAsync({
          id: cardToEdit.id,
          data: {
            ...cardData,
            budgetId: budgetId, // Preserve the budgetId when updating
          },
        });
        setCardToEdit(null);
        toast.success("Card updated successfully!");
      } else {
        // Include budgetId when creating a new card
        await createCardMutation.mutateAsync({
          ...cardData,
          budgetId: budgetId,
        });
        setShowAddCardModal(false);
        toast.success("Card created successfully!");
      }
    } catch (err) {
      console.error("Failed to save card:", err);
      toast.error("Failed to save card. Please try again.");
    }
  };

  const handleEditCard = (card: Card) => {
    const originalApiCard = apiCards?.find((c) => c.id === card.id);
    if (!originalApiCard) {
      console.error("Failed to load card data for editing");
      return;
    }

    setCardToEdit(originalApiCard);
  };

  const handleCopyCard = async (card: Card) => {
    try {
      const originalApiCard = apiCards?.find((c) => c.id === card.id);
      if (!originalApiCard) {
        console.error("Failed to load card data for copying");
        toast.error("Failed to load card data for copying");
        return;
      }

      // Create a copy with "Copy" appended to the name
      const copyData = {
        name: `${originalApiCard.name} Copy`,
        cardType: originalApiCard.cardType,
        spendingLimit: originalApiCard.spendingLimit ?? undefined,
        userId: originalApiCard.userId,
        budgetId: budgetId, // Include budgetId for the copied card
      };

      await createCardMutation.mutateAsync(copyData);
      toast.success("Card copied successfully!");
    } catch (err) {
      console.error("Failed to copy card:", err);
      toast.error("Failed to copy card. Please try again.");
    }
  };

  const handleDeleteCard = (card: Card) => {
    setCardToDelete(card);
  };

  const handleConfirmDelete = async () => {
    if (!cardToDelete) return;

    try {
      await deleteCardMutation.mutateAsync(cardToDelete.id);
      setCardToDelete(null);
      toast.success("Card deleted successfully!");
    } catch (err) {
      // Error is handled by the mutation
      console.error("Failed to delete card:", err);
      toast.error("Failed to delete card. Please try again.");
    }
  };

  const handleCancelDelete = () => {
    setCardToDelete(null);
  };

  const handleCardClick = (card: Card) => {
    router.push(`/budgets/${budgetId}/cards/${card.id}`);
  };

  const { totalSpent, totalLimit, activeCards, creditCards } = useMemo(() => {
    const totalSpent = cards.reduce((sum, card) => sum + card.amountSpent, 0);
    const totalLimit = cards
      .filter(
        (card) =>
          card.spendingLimit &&
          (card.type === "credit" || card.type === "business_credit"),
      )
      .reduce((sum, card) => sum + (card.spendingLimit ?? 0), 0);
    const activeCards = cards.filter((card) => card.isActive).length;
    const creditCards = cards.filter(
      (card) => card.type === "credit" || card.type === "business_credit",
    ).length;

    return { totalSpent, totalLimit, activeCards, creditCards };
  }, [cards]);

  // Memoize filtered card arrays
  const creditCardsArray = useMemo(() => {
    return cards.filter(
      (card) => card.type === "credit" || card.type === "business_credit",
    );
  }, [cards]);

  const debitCardsArray = useMemo(() => {
    return cards.filter(
      (card) => card.type === "debit" || card.type === "business_debit",
    );
  }, [cards]);

  const cashCardsArray = useMemo(() => {
    return cards.filter((card) => card.type === "cash");
  }, [cards]);

  // Show loading state while either budget or cards are loading
  if (budgetLoading || cardsLoading) {
    return <LoadingSpinner message="Loading budget cards..." />;
  }

  // Show error state if there's an error with budget or cards
  if (budgetError || cardsError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-red-500">
            <AlertCircle className="mx-auto h-12 w-12" />
          </div>
          <div className="mb-2 text-lg text-red-600">
            Error loading budget cards
          </div>
          <div className="text-sm text-gray-500">
            {budgetError?.message ??
              cardsError?.message ??
              "An unexpected error occurred"}
          </div>
        </div>
      </div>
    );
  }

  // Show not found state if budget doesn't exist
  if (!budget) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-gray-400">
            <Target className="mx-auto h-12 w-12" />
          </div>
          <div className="text-lg text-gray-600">Budget not found</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto w-full px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-4">
          {/* Overview Stats */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
            <StatsCard
              title="Total Spent"
              value={`$${totalSpent.toLocaleString()}`}
              subtitle="Across budget cards"
              icon={
                <DollarSign className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
              }
              iconColor="text-green-500"
            />

            <StatsCard
              title="Credit Limit"
              value={`$${totalLimit.toLocaleString()}`}
              subtitle="Available credit"
              icon={
                <CreditCard className="h-4 w-4 text-blue-500 sm:h-5 sm:w-5" />
              }
              iconColor="text-blue-500"
            />

            <StatsCard
              title="Active Cards"
              value={activeCards}
              subtitle={`${cards.length - activeCards} inactive`}
              icon={
                <Shield className="h-4 w-4 text-purple-500 sm:h-5 sm:w-5" />
              }
              iconColor="text-purple-500"
            />

            <StatsCard
              title="Credit Cards"
              value={creditCards}
              subtitle={`${cards.length - creditCards} debit & cash cards`}
              icon={
                <CreditCard className="h-4 w-4 text-indigo-500 sm:h-5 sm:w-5" />
              }
              iconColor="text-indigo-500"
            />
          </div>

          {/* Cards Grid */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Budget Cards
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Credit Cards Section */}
            {creditCardsArray.length > 0 &&
              creditCardsArray.map((card) => {
                const isEditing = cardToEdit?.id === card.id;

                if (isEditing) {
                  return (
                    <AddCardForm
                      key={`edit-${card.id}`}
                      onSubmit={handleSubmitCard}
                      onCancel={handleCancelEdit}
                      isLoading={updateCardMutation.isPending}
                      cardToEdit={{
                        id: cardToEdit.id,
                        name: cardToEdit.name,
                        cardType: cardToEdit.cardType,
                        spendingLimit: cardToEdit.spendingLimit ?? undefined,
                        userId: cardToEdit.userId,
                      }}
                      users={users}
                      loadingUsers={loadingUsers}
                      defaultValues={{
                        name: cardToEdit.name,
                        cardType: cardToEdit.cardType,
                        spendingLimit:
                          cardToEdit.spendingLimit?.toString() ?? "",
                        userId: cardToEdit.userId,
                      }}
                    />
                  );
                }

                return (
                  <CardComponent
                    key={card.id}
                    card={card}
                    onEdit={handleEditCard}
                    onCopy={handleCopyCard}
                    onDelete={handleDeleteCard}
                    onClick={handleCardClick}
                    canEdit={card.userId === session?.user?.id}
                  />
                );
              })}

            {/* Debit Cards Section */}
            {debitCardsArray.length > 0 &&
              debitCardsArray.map((card) => {
                const isEditing = cardToEdit?.id === card.id;

                if (isEditing) {
                  return (
                    <AddCardForm
                      key={`edit-${card.id}`}
                      onSubmit={handleSubmitCard}
                      onCancel={handleCancelEdit}
                      isLoading={updateCardMutation.isPending}
                      cardToEdit={{
                        id: cardToEdit.id,
                        name: cardToEdit.name,
                        cardType: cardToEdit.cardType,
                        spendingLimit: cardToEdit.spendingLimit ?? undefined,
                        userId: cardToEdit.userId,
                      }}
                      users={users}
                      loadingUsers={loadingUsers}
                      defaultValues={{
                        name: cardToEdit.name,
                        cardType: cardToEdit.cardType,
                        spendingLimit:
                          cardToEdit.spendingLimit?.toString() ?? "",
                        userId: cardToEdit.userId,
                      }}
                    />
                  );
                }

                return (
                  <CardComponent
                    key={card.id}
                    card={card}
                    onEdit={handleEditCard}
                    onCopy={handleCopyCard}
                    onDelete={handleDeleteCard}
                    onClick={handleCardClick}
                    canEdit={card.userId === session?.user?.id}
                  />
                );
              })}

            {/* Cash Cards Section */}
            {cashCardsArray.length > 0 &&
              cashCardsArray.map((card) => {
                const isEditing = cardToEdit?.id === card.id;

                if (isEditing) {
                  return (
                    <AddCardForm
                      key={`edit-${card.id}`}
                      onSubmit={handleSubmitCard}
                      onCancel={handleCancelEdit}
                      isLoading={updateCardMutation.isPending}
                      cardToEdit={{
                        id: cardToEdit.id,
                        name: cardToEdit.name,
                        cardType: cardToEdit.cardType,
                        spendingLimit: cardToEdit.spendingLimit ?? undefined,
                        userId: cardToEdit.userId,
                      }}
                      users={users}
                      loadingUsers={loadingUsers}
                      defaultValues={{
                        name: cardToEdit.name,
                        cardType: cardToEdit.cardType,
                        spendingLimit:
                          cardToEdit.spendingLimit?.toString() ?? "",
                        userId: cardToEdit.userId,
                      }}
                    />
                  );
                }

                return (
                  <CardComponent
                    key={card.id}
                    card={card}
                    onEdit={handleEditCard}
                    onCopy={handleCopyCard}
                    onDelete={handleDeleteCard}
                    onClick={handleCardClick}
                    canEdit={card.userId === session?.user?.id}
                  />
                );
              })}

            {/* Empty State - only show if no cards */}
            {cards.length === 0 && (
              <div className="col-span-full text-center">
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-12">
                  <CreditCard className="mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">
                    No budget cards yet
                  </h3>
                  <p className="mb-6 text-sm text-gray-500">
                    Add cards to this budget to get started
                  </p>
                  <Button onClick={handleAddCard} variant="primary">
                    <Plus className="h-4 w-4" />
                    Add Card
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={handleCancelAdd}
        >
          <div
            className="w-full max-w-md transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <AddCardForm
              onSubmit={handleSubmitCard}
              onCancel={handleCancelAdd}
              isLoading={createCardMutation.isPending}
              users={users}
              loadingUsers={loadingUsers}
              defaultValues={{
                userId:
                  users.length === 1
                    ? (users[0]?.id ?? "")
                    : (session?.user?.id ?? ""),
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {cardToDelete && (
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
      )}

      {/* Card Payment Modal */}
      {showCardPaymentModal && (
        <CardPaymentModal
          isOpen={showCardPaymentModal}
          onClose={() => setShowCardPaymentModal(false)}
          budgetId={budgetId}
        />
      )}

      {/* Add Transaction Modal */}
      {showAddTransactionModal && (
        <AddTransactionModal
          isOpen={showAddTransactionModal}
          budgetId={budgetId}
          onClose={() => setShowAddTransactionModal(false)}
        />
      )}
    </>
  );
};

export default BudgetCardsPage;
