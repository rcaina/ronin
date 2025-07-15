"use client";

import { Plus, CreditCard, DollarSign, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import PageHeader from "@/components/PageHeader";
import { default as CardComponent } from "@/components/cards/Card";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import AddCardForm from "@/components/cards/AddCardForm";
import AddItemButton from "@/components/AddItemButton";
import { CardPaymentModal } from "@/components/transactions/CardPaymentModal";
import {
  useCards,
  useDeleteCard,
  useCreateCard,
  useUpdateCard,
} from "@/lib/data-hooks/cards/useCards";
import { type Card as ApiCard } from "@/lib/data-hooks/services/cards";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { CardType } from "@prisma/client";
import Button from "@/components/Button";
import { mapApiCardToCard, type Card } from "@/lib/utils/cards";

interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: string;
}

const CardsPage = () => {
  const { data: session } = useSession();
  const { data: apiCards, isLoading, error } = useCards();
  const deleteCardMutation = useDeleteCard();
  const createCardMutation = useCreateCard();
  const updateCardMutation = useUpdateCard();
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<ApiCard | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showCardPaymentModal, setShowCardPaymentModal] = useState(false);

  // Map API cards to component cards
  const cards: Card[] = apiCards
    ? apiCards.map((apiCard, index) => mapApiCardToCard(apiCard, index))
    : [];

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
  useEffect(() => {
    if (session) {
      void fetchUsers();
    }
  }, [session, cardToEdit]);

  const handleAddCard = () => {
    setIsAddingCard(true);
    setCardToEdit(null);
  };

  const handleCancelAdd = () => {
    setIsAddingCard(false);
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
          data: cardData,
        });
        setCardToEdit(null);
        toast.success("Card updated successfully!");
      } else {
        await createCardMutation.mutateAsync(cardData);
        setIsAddingCard(false);
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
        spendingLimit: originalApiCard.spendingLimit,
        userId: originalApiCard.userId,
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

  const totalSpent = cards.reduce((sum, card) => sum + card.amountSpent, 0);
  const totalLimit = cards
    .filter((card) => card.spendingLimit)
    .reduce((sum, card) => sum + (card.spendingLimit ?? 0), 0);
  const activeCards = cards.filter((card) => card.isActive).length;
  const creditCards = cards.filter(
    (card) => card.type === "credit" || card.type === "business_credit",
  ).length;

  if (isLoading) {
    return <LoadingSpinner message="Loading cards..." />;
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-lg text-red-500">
          {error instanceof Error ? error.message : "Failed to load cards"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <PageHeader
        title="Cards"
        description="View and manage credit and debit cards in your account"
        action={{
          label: "Pay Credit Card",
          onClick: () => setShowCardPaymentModal(true),
          icon: <CreditCard className="h-4 w-4" />,
        }}
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
          {/* Overview Stats */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
            <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-4 lg:p-6">
              <div className="mb-2 flex items-center justify-between sm:mb-3 lg:mb-4">
                <h3 className="text-xs font-medium text-gray-500 sm:text-sm">
                  Total Spent
                </h3>
                <DollarSign className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
              </div>
              <div className="text-lg font-bold text-gray-900 sm:text-xl lg:text-2xl">
                ${totalSpent.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-gray-500">Across all cards</div>
            </div>

            <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-4 lg:p-6">
              <div className="mb-2 flex items-center justify-between sm:mb-3 lg:mb-4">
                <h3 className="text-xs font-medium text-gray-500 sm:text-sm">
                  Credit Limit
                </h3>
                <CreditCard className="h-4 w-4 text-blue-500 sm:h-5 sm:w-5" />
              </div>
              <div className="text-lg font-bold text-gray-900 sm:text-xl lg:text-2xl">
                ${totalLimit.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-gray-500">Available credit</div>
            </div>

            <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-4 lg:p-6">
              <div className="mb-2 flex items-center justify-between sm:mb-3 lg:mb-4">
                <h3 className="text-xs font-medium text-gray-500 sm:text-sm">
                  Active Cards
                </h3>
                <Shield className="h-4 w-4 text-purple-500 sm:h-5 sm:w-5" />
              </div>
              <div className="text-lg font-bold text-gray-900 sm:text-xl lg:text-2xl">
                {activeCards}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {cards.length - activeCards} inactive
              </div>
            </div>

            <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-4 lg:p-6">
              <div className="mb-2 flex items-center justify-between sm:mb-3 lg:mb-4">
                <h3 className="text-xs font-medium text-gray-500 sm:text-sm">
                  Credit Cards
                </h3>
                <CreditCard className="h-4 w-4 text-indigo-500 sm:h-5 sm:w-5" />
              </div>
              <div className="text-lg font-bold text-gray-900 sm:text-xl lg:text-2xl">
                {creditCards}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {cards.length - creditCards} debit & cash cards
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Account Cards
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Add New Card Form */}
            {isAddingCard && !cardToEdit && (
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
            )}

            {/* Add New Card Button (always visible) */}
            {!isAddingCard && cards.length !== 0 && (
              <AddItemButton
                onClick={handleAddCard}
                title="Add Card"
                description="Add a new credit or debit card"
              />
            )}

            {/* Credit Cards Section */}
            {cards.filter(
              (card) =>
                card.type === "credit" || card.type === "business_credit",
            ).length > 0 &&
              cards
                .filter(
                  (card) =>
                    card.type === "credit" || card.type === "business_credit",
                )
                .map((card) => {
                  const isEditing = cardToEdit?.id === card.id;

                  if (isEditing) {
                    return (
                      <AddCardForm
                        key={`edit-${card.id}`}
                        onSubmit={handleSubmitCard}
                        onCancel={handleCancelEdit}
                        isLoading={updateCardMutation.isPending}
                        cardToEdit={cardToEdit}
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
                      canEdit={card.userId === session?.user?.id}
                    />
                  );
                })}

            {/* Debit Cards Section */}
            {cards.filter(
              (card) => card.type === "debit" || card.type === "business_debit",
            ).length > 0 &&
              cards
                .filter(
                  (card) =>
                    card.type === "debit" || card.type === "business_debit",
                )
                .map((card) => {
                  const isEditing = cardToEdit?.id === card.id;

                  if (isEditing) {
                    return (
                      <AddCardForm
                        key={`edit-${card.id}`}
                        onSubmit={handleSubmitCard}
                        onCancel={handleCancelEdit}
                        isLoading={updateCardMutation.isPending}
                        cardToEdit={cardToEdit}
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
                      canEdit={card.userId === session?.user?.id}
                    />
                  );
                })}

            {/* Cash Cards Section */}
            {cards.filter((card) => card.type === "cash").length > 0 &&
              cards
                .filter((card) => card.type === "cash")
                .map((card) => {
                  const isEditing = cardToEdit?.id === card.id;

                  if (isEditing) {
                    return (
                      <AddCardForm
                        key={`edit-${card.id}`}
                        onSubmit={handleSubmitCard}
                        onCancel={handleCancelEdit}
                        isLoading={updateCardMutation.isPending}
                        cardToEdit={cardToEdit}
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
                      canEdit={card.userId === session?.user?.id}
                    />
                  );
                })}

            {/* Empty State - only show if no cards and not adding */}
            {cards.length === 0 && !isAddingCard && (
              <div className="col-span-full text-center">
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-12">
                  <CreditCard className="mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">
                    No cards yet
                  </h3>
                  <p className="mb-6 text-sm text-gray-500">
                    Add your first credit or debit card to get started
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

      {/* Card Payment Modal */}
      <CardPaymentModal
        isOpen={showCardPaymentModal}
        onClose={() => setShowCardPaymentModal(false)}
      />
    </div>
  );
};

export default CardsPage;
