"use client";

import { Plus, CreditCard, DollarSign, Shield } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import PageHeader from "@/components/PageHeader";
import { default as CardComponent } from "@/components/cards/Card";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import AddCardForm from "@/components/cards/AddCardForm";
import { CardPaymentModal } from "@/components/transactions/CardPaymentModal";
import {
  useGeneralCards,
  useDeleteCard,
  useCreateCard,
  useUpdateCard,
} from "@/lib/data-hooks/cards/useCards";
import { CardApiError } from "@/lib/data-hooks/services/cards";
import type { Card as ApiCard } from "@/lib/types/card";
import { usePageLoading } from "@/components/ConditionalLayout";
import type { CardType } from "@prisma/client";
import Button from "@/components/Button";
import { mapApiCardToCard, type Card } from "@/lib/utils/cards";
import { formatCurrency } from "@/lib/utils";
import { useLockBodyScroll } from "@/lib/utils/hooks";
import StatsCard from "@/components/StatsCard";

interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: string;
}

// A 409 from the create endpoint means the user already has a general card
// with this name or last-four digits.
const isDuplicateCardError = (err: unknown): boolean =>
  err instanceof CardApiError && err.status === 409;

const CardsPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: apiCards, isLoading, error } = useGeneralCards();
  const deleteCardMutation = useDeleteCard();
  const createCardMutation = useCreateCard();
  const updateCardMutation = useUpdateCard();
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  useLockBodyScroll(showAddCardModal);
  const [cardToEdit, setCardToEdit] = useState<ApiCard | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showCardPaymentModal, setShowCardPaymentModal] = useState(false);
  const [activeOwner, setActiveOwner] = useState<string>("all");

  // Map API cards to component cards
  const cards: Card[] = useMemo(() => {
    return apiCards ? apiCards.map((apiCard) => mapApiCardToCard(apiCard)) : [];
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
    lastFourDigits?: string;
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
        setShowAddCardModal(false);
        toast.success("Card created successfully!");
      }
    } catch (err) {
      console.error("Failed to save card:", err);
      if (isDuplicateCardError(err)) {
        toast.error(
          "You already have a card with this name or last four digits",
        );
      } else {
        toast.error("Failed to save card. Please try again.");
      }
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

      // Create a copy with "Copy" appended to the name. The copy is a
      // different physical card, so don't carry over the last-four digits —
      // they must stay unique per owner (the server 409s on a match).
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
      if (isDuplicateCardError(err)) {
        toast.error("You already have a card with this name");
      } else {
        toast.error("Failed to copy card. Please try again.");
      }
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
    router.push(`/cards/${card.id}`);
  };

  const { totalSpent, totalLimit, activeCards, creditCards } = useMemo(() => {
    const totalSpent = cards.reduce((sum, card) => sum + card.amountSpent, 0);
    const totalLimit = cards
      .filter(
        (card) => card.type === "credit" || card.type === "business_credit",
      )
      .reduce((sum, card) => sum + (card.spendingLimit ?? 0), 0);
    const activeCards = cards.filter((card) => card.isActive).length;
    const creditCards = cards.filter(
      (card) => card.type === "credit" || card.type === "business_credit",
    ).length;

    return { totalSpent, totalLimit, activeCards, creditCards };
  }, [cards]);

  // Build a tab per card owner. Only surface tabs when more than one person
  // owns cards; a single owner just shows everything (no tabs needed).
  const ownerTabs = useMemo(() => {
    const byOwner = new Map<
      string,
      { id: string; label: string; count: number }
    >();
    for (const card of cards) {
      const existing = byOwner.get(card.userId);
      if (existing) {
        existing.count += 1;
      } else {
        byOwner.set(card.userId, {
          id: card.userId,
          label: card.user,
          count: 1,
        });
      }
    }
    const owners = Array.from(byOwner.values());
    if (owners.length <= 1) return [];
    return [{ id: "all", label: "All", count: cards.length }, ...owners];
  }, [cards]);

  // Guard against a stale selection (e.g. the selected owner's last card was
  // deleted) by falling back to "all" when the active owner has no tab.
  const effectiveOwner = useMemo(() => {
    if (activeOwner === "all") return "all";
    return ownerTabs.some((tab) => tab.id === activeOwner)
      ? activeOwner
      : "all";
  }, [activeOwner, ownerTabs]);

  const ownerFilteredCards = useMemo(() => {
    if (effectiveOwner === "all") return cards;
    return cards.filter((card) => card.userId === effectiveOwner);
  }, [cards, effectiveOwner]);

  // Memoize filtered card arrays
  const creditCardsArray = useMemo(() => {
    return ownerFilteredCards.filter(
      (card) => card.type === "credit" || card.type === "business_credit",
    );
  }, [ownerFilteredCards]);

  const debitCardsArray = useMemo(() => {
    return ownerFilteredCards.filter(
      (card) => card.type === "debit" || card.type === "business_debit",
    );
  }, [ownerFilteredCards]);

  const cashCardsArray = useMemo(() => {
    return ownerFilteredCards.filter((card) => card.type === "cash");
  }, [ownerFilteredCards]);

  // Renders either the inline edit form (when this card is the one being
  // edited) or the card tile itself. Shared by the credit/debit/cash
  // sections below so the markup is written once instead of three times.
  const renderCardTile = (card: Card) => {
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
            lastFourDigits: cardToEdit.lastFourDigits,
            cardType: cardToEdit.cardType,
            spendingLimit: cardToEdit.spendingLimit,
            userId: cardToEdit.userId,
          }}
          users={users}
          loadingUsers={loadingUsers}
          defaultValues={{
            name: cardToEdit.name,
            lastFourDigits: cardToEdit.lastFourDigits ?? "",
            cardType: cardToEdit.cardType,
            spendingLimit: cardToEdit.spendingLimit?.toString() ?? "",
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
        general={true}
      />
    );
  };

  usePageLoading(isLoading, "Loading cards...");
  if (isLoading) {
    return null;
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
    <div className="flex flex-col bg-surface lg:h-screen">
      <PageHeader
        title="Cards"
        description="The cards on your account, tracked across every budget"
        actions={[
          {
            label: "Add card",
            onClick: handleAddCard,
            icon: <Plus className="h-4 w-4" />,
            variant: "primary",
          },
          {
            label: "Pay credit card",
            onClick: () => setShowCardPaymentModal(true),
            icon: <CreditCard className="h-4 w-4" />,
          },
        ]}
      />

      <div className="pt-4 lg:flex-1 lg:overflow-hidden lg:pt-0">
        <div className="lg:h-full lg:overflow-y-auto">
          <div className="mx-auto w-full px-2 py-4 pb-28 sm:px-4 sm:py-6 sm:pb-28 lg:px-8 lg:py-8 lg:pb-8">
            {/* Overview Stats */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
              <StatsCard
                title="Total spent"
                value={formatCurrency(totalSpent)}
                subtitle="Across all cards"
                icon={
                  <DollarSign className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />
                }
                iconColor="text-green-600"
              />

              <StatsCard
                title="Credit limit"
                value={formatCurrency(totalLimit)}
                subtitle="Across credit cards"
                icon={
                  <CreditCard className="h-4 w-4 text-secondary-600 sm:h-5 sm:w-5" />
                }
                iconColor="text-secondary-600"
              />

              <StatsCard
                title="Active cards"
                value={activeCards}
                subtitle={`${cards.length - activeCards} inactive`}
                icon={
                  <Shield className="h-4 w-4 text-secondary-600 sm:h-5 sm:w-5" />
                }
                iconColor="text-secondary-600"
              />

              <StatsCard
                title="Credit cards"
                value={creditCards}
                subtitle={`${cards.length - creditCards} debit & cash cards`}
                icon={
                  <CreditCard className="h-4 w-4 text-secondary-600 sm:h-5 sm:w-5" />
                }
                iconColor="text-secondary-600"
              />
            </div>

            {/* Cards Grid */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                Account cards
              </h2>

              {/* Owner tabs — segmented control (only when >1 person owns cards) */}
              {ownerTabs.length > 1 && (
                <div className="scrollbar-hide -mx-2 overflow-x-auto px-2 sm:mx-0 sm:overflow-visible sm:px-0">
                  <div className="inline-flex rounded-full bg-surface-muted p-1">
                    {ownerTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveOwner(tab.id)}
                        className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ease-out ${
                          effectiveOwner === tab.id
                            ? "bg-surface-card text-gray-900 shadow-soft"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {tab.label}
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                            effectiveOwner === tab.id
                              ? "bg-secondary/15 text-secondary-700"
                              : "bg-gray-200/70 text-gray-500"
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Credit, debit, and cash cards, each rendered through the same
                  card-or-inline-edit-form helper below. */}
              {creditCardsArray.map(renderCardTile)}
              {debitCardsArray.map(renderCardTile)}
              {cashCardsArray.map(renderCardTile)}

              {/* Empty State - only show if no cards */}
              {cards.length === 0 && (
                <div className="col-span-full text-center">
                  <div className="card-surface flex flex-col items-center justify-center gap-3 p-10">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-gray-400">
                      <CreditCard className="h-7 w-7" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight text-gray-900">
                      No cards yet
                    </h3>
                    <p className="text-sm text-gray-500">
                      Add a card once and use it across all your budgets
                    </p>
                    <Button onClick={handleAddCard} variant="primary">
                      <Plus className="h-4 w-4" />
                      Add card
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-primary-950/40 p-4 backdrop-blur-sm"
          onClick={handleCancelAdd}
        >
          <div
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md transform animate-scale-in overflow-y-auto overscroll-contain transition-all"
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
        />
      )}
    </div>
  );
};

export default CardsPage;
