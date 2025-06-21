"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useSession } from "next-auth/react";
import SetupProgress from "@/components/SetupProgress";
import type { PeriodType } from "@prisma/client";

// Validation schemas
const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["ADMIN", "MEMBER"]),
});

const inviteListSchema = z.array(inviteSchema);

interface BudgetData {
  name: string;
  strategy: "ZERO_SUM" | "PERCENTAGE";
  period: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_TIME";
  startAt: string;
  endAt: string;
}

interface IncomeData {
  amount: number;
  source: string;
  description: string;
  isPlanned: boolean;
  frequency: PeriodType;
}

interface InviteData {
  email: string;
  role: "ADMIN" | "MEMBER";
}

const setupSteps = [
  { id: "budget", title: "Budget", description: "Basic details" },
  { id: "income", title: "Income", description: "Set your income" },
  { id: "categories", title: "Categories", description: "Choose categories" },
  { id: "allocation", title: "Allocation", description: "Allocate funds" },
  { id: "invite", title: "Invite", description: "Invite others" },
];

export default function InviteSetupPage() {
  const router = useRouter();
  const { update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [invites, setInvites] = useState<InviteData[]>([]);
  const [newInvite, setNewInvite] = useState<InviteData>({
    email: "",
    role: "MEMBER",
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const storedBudget = sessionStorage.getItem("setupBudget");
    const storedIncome = sessionStorage.getItem("setupIncome");
    const storedCategories = sessionStorage.getItem("setupCategories");
    const storedAllocation = sessionStorage.getItem("setupAllocation");
    const skippedCategories = sessionStorage.getItem("setupSkippedCategories");

    console.log("Debug - Invite page validation:", {
      storedBudget: !!storedBudget,
      storedIncome: !!storedIncome,
      storedCategories: !!storedCategories,
      storedAllocation: !!storedAllocation,
      skippedCategories: !!skippedCategories,
      categoriesValue: storedCategories,
      allocationValue: storedAllocation,
      skippedValue: skippedCategories,
    });

    if (
      !storedBudget ||
      !storedIncome ||
      !storedCategories ||
      (!storedAllocation && !skippedCategories)
    ) {
      console.log(
        "Debug - Invite page validation failed, redirecting to budget",
      );
      router.push("/setup/budget");
      return;
    }

    try {
      setBudgetData(JSON.parse(storedBudget) as BudgetData);
      console.log("Debug - Invite page loaded successfully");
    } catch (error) {
      console.log("Debug - Invite page error parsing budget:", error);
      router.push("/setup/budget");
    }
  }, [router]);

  const handleAddInvite = () => {
    setValidationError(null);

    // Validate the new invite
    const validationResult = inviteSchema.safeParse(newInvite);
    if (!validationResult.success) {
      setValidationError(
        validationResult.error.errors[0]?.message ?? "Invalid invite data",
      );
      return;
    }

    // Check for duplicate emails
    if (invites.some((invite) => invite.email === newInvite.email)) {
      setValidationError("This email is already in the invite list");
      return;
    }

    setInvites([...invites, newInvite]);
    setNewInvite({ email: "", role: "MEMBER" });
  };

  const handleRemoveInvite = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index));
  };

  const handleCompleteSetup = async () => {
    setIsLoading(true);

    try {
      // Validate all invites before proceeding
      const inviteValidationResult = inviteListSchema.safeParse(invites);
      if (!inviteValidationResult.success) {
        setValidationError("One or more invites have invalid data");
        setIsLoading(false);
        return;
      }

      // Get all setup data from sessionStorage
      const budgetData = JSON.parse(
        sessionStorage.getItem("setupBudget") ?? "{}",
      ) as BudgetData;
      const incomeData = JSON.parse(
        sessionStorage.getItem("setupIncome") ?? "{}",
      ) as IncomeData;
      const selectedCategories = JSON.parse(
        sessionStorage.getItem("setupCategories") ?? "[]",
      ) as string[];
      const allocationData = JSON.parse(
        sessionStorage.getItem("setupAllocation") ?? "{}",
      ) as Record<string, number>;
      const skippedCategories = sessionStorage.getItem(
        "setupSkippedCategories",
      );

      // Create the budget
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: budgetData.name,
          strategy: budgetData.strategy,
          period: budgetData.period,
          startAt: budgetData.startAt,
          endAt: budgetData.endAt,
          selectedCategories: selectedCategories,
          categoryAllocations: skippedCategories ? {} : allocationData,
          income: {
            amount: incomeData.amount,
            source: incomeData.source,
            description: incomeData.description,
            isPlanned: incomeData.isPlanned,
            frequency: incomeData.frequency,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create budget");
      }

      // Update the user's session to reflect they now have a budget
      const sessionResponse = await fetch("/api/auth/update-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!sessionResponse.ok) {
        console.warn(
          "Failed to update session, but budget was created successfully",
        );
      }

      // Force a session refresh to update the hasBudget field
      await update();

      // Store invite data in sessionStorage (for future use)
      sessionStorage.setItem("setupInvites", JSON.stringify(invites));

      // Clear setup data
      sessionStorage.removeItem("setupBudget");
      sessionStorage.removeItem("setupIncome");
      sessionStorage.removeItem("setupCategories");
      sessionStorage.removeItem("setupAllocation");
      sessionStorage.removeItem("setupSkippedCategories");

      // Redirect to overview page
      router.push("/");
    } catch (error) {
      console.error("Error completing setup:", error);
      alert("There was an error completing your setup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    const skippedCategories = sessionStorage.getItem("setupSkippedCategories");
    if (skippedCategories) {
      // If categories were skipped, go back to categories page
      router.push("/setup/categories");
    } else {
      // Otherwise go back to allocation page
      router.push("/setup/allocation");
    }
  };

  if (!budgetData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <div className="relative mx-auto mb-4 h-16 w-16">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-full w-full text-secondary"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
              fill="currentColor"
            />
            <path
              d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Invite Team Members
        </h1>
        <p className="text-gray-600">
          Optionally invite others to collaborate on your budget
        </p>
      </div>

      <SetupProgress currentStep="invite" steps={setupSteps} />

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="mb-4 text-lg font-medium text-gray-900">
            Add Team Members
          </h3>

          <div className="mb-4 flex gap-3">
            <input
              type="email"
              value={newInvite.email}
              onChange={(e) => {
                setNewInvite({ ...newInvite, email: e.target.value });
                if (validationError) {
                  setValidationError(null);
                }
              }}
              placeholder="Enter email address"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-secondary"
            />
            <select
              value={newInvite.role}
              onChange={(e) => {
                setNewInvite({
                  ...newInvite,
                  role: e.target.value as "ADMIN" | "MEMBER",
                });
                if (validationError) {
                  setValidationError(null);
                }
              }}
              className="rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              type="button"
              onClick={handleAddInvite}
              className="hover:bg-secondary/80 rounded-md bg-secondary px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
            >
              Add
            </button>
          </div>

          {validationError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{validationError}</p>
            </div>
          )}
        </div>

        {invites.length > 0 && (
          <div className="mb-6">
            <h4 className="text-md mb-3 font-medium text-gray-900">
              Invited Members ({invites.length})
            </h4>
            <div className="space-y-2">
              {invites.map((invite, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-md bg-gray-50 p-3"
                >
                  <div>
                    <span className="font-medium text-gray-900">
                      {invite.email}
                    </span>
                    <span className="ml-2 text-sm capitalize text-gray-500">
                      ({invite.role.toLowerCase()})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveInvite(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 p-4">
          <h4 className="mb-2 text-sm font-medium text-blue-900">
            Role Permissions
          </h4>
          <div className="space-y-1 text-sm text-blue-700">
            <p>
              <strong>Admin:</strong> Can manage budget settings, categories,
              and team members
            </p>
            <p>
              <strong>Member:</strong> Can view budget, add transactions, and
              see reports
            </p>
          </div>
        </div>

        <div className="flex justify-between pt-6">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-md border border-gray-300 bg-white px-6 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleCompleteSetup}
            disabled={isLoading}
            className="hover:bg-secondary/80 rounded-md bg-secondary px-6 py-2 text-white focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Complete Setup"}
          </button>
        </div>
      </div>
    </div>
  );
}
