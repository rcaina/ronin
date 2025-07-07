"use client";

import { Plus, CreditCard, DollarSign, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";
import CardComponent, { type CardData } from "@/components/cards/Card";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import AddCardForm from "@/components/cards/AddCardForm";
import AddItemButton from "@/components/AddItemButton";
import {
  useCards,
  useDeleteCard,
  useCreateCard,
  useUpdateCard,
  mapApiCardToCard,
  type Card,
} from "@/lib/data-hooks/cards/useCards";
import { type Card as ApiCard } from "@/lib/data-hooks/services/cards";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { CardType } from "@prisma/client";
import Button from "@/components/Button";

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
  const [cardToDelete, setCardToDelete] = useState<CardData | null>(null);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<ApiCard | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Map API cards to component cards
  const cards: Card[] = apiCards ? apiCards.map(mapApiCardToCard) : [];

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
      } else {
        await createCardMutation.mutateAsync(cardData);
        setIsAddingCard(false);
      }
    } catch (err) {
      console.error("Failed to save card:", err);
    }
  };

  const handleEditCard = (card: CardData) => {
    const originalApiCard = apiCards?.find((c) => c.id === card.id);
    if (!originalApiCard) {
      console.error("Failed to load card data for editing");
      return;
    }

    setCardToEdit(originalApiCard);
  };

  const handleCopyCard = async (card: CardData) => {
    try {
      const originalApiCard = apiCards?.find((c) => c.id === card.id);
      if (!originalApiCard) {
        console.error("Failed to load card data for copying");
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
    } catch (err) {
      console.error("Failed to copy card:", err);
    }
  };

  const handleDeleteCard = (card: CardData) => {
    setCardToDelete(card);
  };

  const handleConfirmDelete = async () => {
    if (!cardToDelete) return;

    try {
      await deleteCardMutation.mutateAsync(cardToDelete.id);
      setCardToDelete(null);
    } catch (err) {
      // Error is handled by the mutation
      console.error("Failed to delete card:", err);
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
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Overview Stats */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">
                  Total Spent
                </h3>
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                ${totalSpent.toLocaleString()}
              </div>
              <div className="mt-1 text-sm text-gray-500">Across all cards</div>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">
                  Credit Limit
                </h3>
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                ${totalLimit.toLocaleString()}
              </div>
              <div className="mt-1 text-sm text-gray-500">Available credit</div>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">
                  Active Cards
                </h3>
                <Shield className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {activeCards}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                {cards.length - activeCards} inactive
              </div>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">
                  Credit Cards
                </h3>
                <CreditCard className="h-5 w-5 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {creditCards}
              </div>
              <div className="mt-1 text-sm text-gray-500">
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
    </div>
  );
};

export default CardsPage;
