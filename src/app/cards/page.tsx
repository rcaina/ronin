"use client";

import { useRouter } from "next/navigation";
import {
  Plus,
  CreditCard,
  DollarSign,
  Shield,
  MoreVertical,
  Edit,
  Copy,
} from "lucide-react";
import { useState } from "react";
import PageHeader from "@/components/PageHeader";

interface Card {
  id: string;
  name: string;
  type: "credit" | "debit";
  amountSpent: number;
  spendingLimit?: number;
  user: string;
  isActive: boolean;
  bank: string;
  color: string;
}

// Mock data - replace with actual data fetching
const mockCards: Card[] = [
  {
    id: "1",
    name: "Chase Sapphire Preferred",
    type: "credit",
    amountSpent: 2450.75,
    spendingLimit: 10000,
    user: "John Doe",
    isActive: true,
    bank: "Chase",
    color: "bg-gradient-to-br from-blue-600 to-purple-600",
  },
  {
    id: "2",
    name: "Bank of America Debit",
    type: "debit",
    amountSpent: 3247.89,
    user: "John Doe",
    isActive: true,
    bank: "Bank of America",
    color: "bg-gradient-to-br from-green-600 to-teal-600",
  },
  {
    id: "3",
    name: "American Express Gold",
    type: "credit",
    amountSpent: 1890.5,
    spendingLimit: 15000,
    user: "John Doe",
    isActive: true,
    bank: "American Express",
    color: "bg-gradient-to-br from-yellow-500 to-orange-500",
  },
  {
    id: "4",
    name: "Wells Fargo Debit",
    type: "debit",
    amountSpent: 567.23,
    user: "John Doe",
    isActive: false,
    bank: "Wells Fargo",
    color: "bg-gradient-to-br from-red-600 to-pink-600",
  },
];

const CardsPage = () => {
  const router = useRouter();
  const [cards] = useState<Card[]>(mockCards);

  const totalSpent = cards.reduce((sum, card) => sum + card.amountSpent, 0);
  const totalLimit = cards
    .filter((card) => card.spendingLimit)
    .reduce((sum, card) => sum + (card.spendingLimit ?? 0), 0);
  const activeCards = cards.filter((card) => card.isActive).length;
  const creditCards = cards.filter((card) => card.type === "credit").length;

  const getCardTypeIcon = (type: string) => {
    return type === "credit" ? (
      <CreditCard className="h-4 w-4" />
    ) : (
      <DollarSign className="h-4 w-4" />
    );
  };

  const getUtilizationPercentage = (
    amountSpent: number,
    spendingLimit?: number,
  ) => {
    if (!spendingLimit) return 0;
    return (amountSpent / spendingLimit) * 100;
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage > 80) return "text-red-600";
    if (percentage > 60) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <PageHeader
        title="Cards"
        description="Manage your credit and debit cards"
        action={{
          label: "Add Card",
          onClick: () => router.push("/cards/add"),
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
                    <div
                      key={card.id}
                      className={`relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md ${
                        !card.isActive ? "opacity-60" : ""
                      }`}
                    >
                      {/* Card Header */}
                      <div className={`${card.color} p-6 text-white`}>
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getCardTypeIcon(card.type)}
                            <span className="text-sm font-medium uppercase">
                              {card.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="rounded-full p-1 hover:bg-white/20">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Card Name */}
                        <div className="mb-4">
                          <div className="text-sm text-white/80">Card Name</div>
                          <div className="text-lg font-semibold">
                            {card.name}
                          </div>
                        </div>

                        {/* Card Details */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-white/80">User</div>
                            <div className="font-semibold">{card.user}</div>
                          </div>
                          <div>
                            <div className="text-sm text-white/80">Bank</div>
                            <div className="font-semibold">{card.bank}</div>
                          </div>
                        </div>
                      </div>

                      {/* Card Info */}
                      <div className="p-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {card.name}
                          </h3>
                          <p className="text-sm text-gray-500">{card.bank}</p>
                        </div>

                        {/* Balance and Limit */}
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Spent</span>
                              <span className="font-semibold text-gray-900">
                                ${card.amountSpent.toLocaleString()}
                              </span>
                            </div>
                            {card.spendingLimit && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Limit</span>
                                <span className="font-semibold text-gray-900">
                                  ${card.spendingLimit.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Utilization Bar */}
                          {card.spendingLimit && (
                            <div>
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="text-gray-500">
                                  Utilization
                                </span>
                                <span
                                  className={`font-medium ${getUtilizationColor(
                                    getUtilizationPercentage(
                                      card.amountSpent,
                                      card.spendingLimit,
                                    ),
                                  )}`}
                                >
                                  {getUtilizationPercentage(
                                    card.amountSpent,
                                    card.spendingLimit,
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    getUtilizationPercentage(
                                      card.amountSpent,
                                      card.spendingLimit,
                                    ) > 80
                                      ? "bg-red-500"
                                      : getUtilizationPercentage(
                                            card.amountSpent,
                                            card.spendingLimit,
                                          ) > 60
                                        ? "bg-yellow-500"
                                        : "bg-green-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      getUtilizationPercentage(
                                        card.amountSpent,
                                        card.spendingLimit,
                                      ),
                                      100,
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Status Badge */}
                          <div className="flex items-center justify-between">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                card.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {card.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 flex items-center gap-2">
                          <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                          <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            <Copy className="h-4 w-4" />
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
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
                    <div
                      key={card.id}
                      className={`relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md ${
                        !card.isActive ? "opacity-60" : ""
                      }`}
                    >
                      {/* Card Header */}
                      <div className={`${card.color} p-6 text-white`}>
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getCardTypeIcon(card.type)}
                            <span className="text-sm font-medium uppercase">
                              {card.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="rounded-full p-1 hover:bg-white/20">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Card Name */}
                        <div className="mb-4">
                          <div className="text-sm text-white/80">Card Name</div>
                          <div className="text-lg font-semibold">
                            {card.name}
                          </div>
                        </div>

                        {/* Card Details */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-white/80">User</div>
                            <div className="font-semibold">{card.user}</div>
                          </div>
                          <div>
                            <div className="text-sm text-white/80">Bank</div>
                            <div className="font-semibold">{card.bank}</div>
                          </div>
                        </div>
                      </div>

                      {/* Card Info */}
                      <div className="p-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {card.name}
                          </h3>
                          <p className="text-sm text-gray-500">{card.bank}</p>
                        </div>

                        {/* Balance and Limit */}
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Spent</span>
                              <span className="font-semibold text-gray-900">
                                ${card.amountSpent.toLocaleString()}
                              </span>
                            </div>
                            {card.spendingLimit && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Limit</span>
                                <span className="font-semibold text-gray-900">
                                  ${card.spendingLimit.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Utilization Bar */}
                          {card.spendingLimit && (
                            <div>
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="text-gray-500">
                                  Utilization
                                </span>
                                <span
                                  className={`font-medium ${getUtilizationColor(
                                    getUtilizationPercentage(
                                      card.amountSpent,
                                      card.spendingLimit,
                                    ),
                                  )}`}
                                >
                                  {getUtilizationPercentage(
                                    card.amountSpent,
                                    card.spendingLimit,
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    getUtilizationPercentage(
                                      card.amountSpent,
                                      card.spendingLimit,
                                    ) > 80
                                      ? "bg-red-500"
                                      : getUtilizationPercentage(
                                            card.amountSpent,
                                            card.spendingLimit,
                                          ) > 60
                                        ? "bg-yellow-500"
                                        : "bg-green-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      getUtilizationPercentage(
                                        card.amountSpent,
                                        card.spendingLimit,
                                      ),
                                      100,
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Status Badge */}
                          <div className="flex items-center justify-between">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                card.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {card.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 flex items-center gap-2">
                          <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                          <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            <Copy className="h-4 w-4" />
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
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
                onClick={() => router.push("/cards/add")}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Card
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardsPage;
