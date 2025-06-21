"use client";

import {
  Plus,
  CreditCard,
  DollarSign,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import AddEditCardModal from "@/components/cards/AddEditCardModal";
import CardComponent, { type CardType } from "@/components/cards/Card";
import {
  useCards,
  useDeleteCard,
  mapApiCardToCard,
  type Card,
} from "@/lib/data-hooks/cards/useCards";
import { type Card as ApiCard } from "@/lib/data-hooks/services/cards";

const CardsPage = () => {
  const { data: apiCards, isLoading, error } = useCards();
  const deleteCardMutation = useDeleteCard();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<ApiCard | null>(null);
  const [cardToDelete, setCardToDelete] = useState<CardType | null>(null);

  // Map API cards to component cards
  const cards: Card[] = apiCards ? apiCards.map(mapApiCardToCard) : [];

  const handleOpenModal = () => {
    setCardToEdit(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCardToEdit(null);
  };

  const handleEditCard = (card: CardType) => {
    const originalApiCard = apiCards?.find((c) => c.id === card.id);
    if (!originalApiCard) {
      console.error("Failed to load card data for editing");
      return;
    }

    setCardToEdit(originalApiCard);
    setIsModalOpen(true);
  };

  const handleCopyCard = (card: CardType) => {
    // TODO: Implement copy functionality
    console.log("Copy card:", card);
  };

  const handleDeleteCard = (card: CardType) => {
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
  const creditCards = cards.filter((card) => card.type === "credit").length;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-lg text-gray-500">Loading cards...</span>
      </div>
    );
  }

  if (error && !isModalOpen) {
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
        description="Manage your credit and debit cards"
        action={{
          label: "Add Card",
          onClick: handleOpenModal,
          icon: <Plus className="h-4 w-4" />,
        }}
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
                {cards.length - creditCards} debit cards
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Your Cards</h2>
          </div>

          {/* Credit Cards Section */}
          {cards.filter((card) => card.type === "credit").length > 0 && (
            <div className="mb-8">
              <h3 className="mb-4 text-lg font-medium text-gray-900">
                Credit Cards
              </h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {cards
                  .filter((card) => card.type === "credit")
                  .map((card) => (
                    <CardComponent
                      key={card.id}
                      card={card}
                      onEdit={handleEditCard}
                      onCopy={handleCopyCard}
                      onDelete={handleDeleteCard}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Debit Cards Section */}
          {cards.filter((card) => card.type === "debit").length > 0 && (
            <div className="mb-8">
              <h3 className="mb-4 text-lg font-medium text-gray-900">
                Debit Cards
              </h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {cards
                  .filter((card) => card.type === "debit")
                  .map((card) => (
                    <CardComponent
                      key={card.id}
                      card={card}
                      onEdit={handleEditCard}
                      onCopy={handleCopyCard}
                      onDelete={handleDeleteCard}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {cards.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-12">
              <CreditCard className="mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                No cards yet
              </h3>
              <p className="mb-6 text-sm text-gray-500">
                Add your first credit or debit card to get started
              </p>
              <button
                onClick={handleOpenModal}
                className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-black/90 hover:bg-yellow-300"
              >
                <Plus className="h-4 w-4" />
                Add Card
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Card Modal */}
      <AddEditCardModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onCardCreated={handleCloseModal}
        onCardUpdated={handleCloseModal}
        cardToEdit={cardToEdit}
      />

      {/* Delete Confirmation Modal */}
      {cardToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center">
              <AlertTriangle className="mr-3 h-6 w-6 text-red-500" />
              <h3 className="text-lg font-medium text-gray-900">Delete Card</h3>
            </div>
            <p className="mb-6 text-sm text-gray-500">
              Are you sure you want to delete &ldquo;{cardToDelete.name}&rdquo;?
              This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleConfirmDelete}
                disabled={deleteCardMutation.isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteCardMutation.isPending ? "Deleting..." : "Delete Card"}
              </button>
              <button
                onClick={handleCancelDelete}
                disabled={deleteCardMutation.isPending}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardsPage;
