"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useBudgets } from "@/lib/data-hooks/budgets/useBudgets";
import { Plus, Users, Home } from "lucide-react";
import Image from "next/image";
import roninLogo from "@/public/ronin_logo.jpg";

export default function WelcomePage() {
  const { status } = useSession();
  const router = useRouter();
  const { data: budgets = [], isLoading } = useBudgets();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (status === "loading" || isLoading) return;

    setIsChecking(false);
  }, [status, isLoading, budgets.length, router]);

  if (status === "loading" || isLoading || isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className={`mx-auto h-36 w-36 flex-shrink-0`}>
            <Image
              src={roninLogo}
              alt="Ronin Logo"
              width={128}
              height={128}
              className="h-full w-full rounded-full"
              priority
            />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Welcome to Ronin
          </h2>
          <p className="text-gray-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 text-center">
          <div className={`mx-auto h-36 w-36 flex-shrink-0`}>
            <Image
              src={roninLogo}
              alt="Ronin Logo"
              width={128}
              height={128}
              className="h-full w-full rounded-full"
              priority
            />
          </div>
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            Welcome to Ronin!
          </h1>
          <p className="text-xl text-gray-600">
            Your personal finance journey starts here. What would you like to do
            first?
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Create First Budget */}
          <button
            onClick={() => router.push("/budgets")}
            className="group flex flex-col items-center rounded-lg border border-gray-200 bg-white p-6 text-center transition-all hover:border-secondary hover:shadow-md"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 group-hover:bg-green-200">
              <Plus className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Create Budget
            </h3>
            <p className="text-sm text-gray-600">
              Set up your first budget to start tracking your finances
            </p>
          </button>

          {/* Invite Users */}
          <button
            onClick={() => router.push("/settings")}
            className="group flex flex-col items-center rounded-lg border border-gray-200 bg-white p-6 text-center transition-all hover:border-secondary hover:shadow-md"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 group-hover:bg-purple-200">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Invite Others
            </h3>
            <p className="text-sm text-gray-600">
              Share your account with family members or partners
            </p>
          </button>

          {/* Go to Home */}
          <button
            onClick={() => router.push("/")}
            className="group flex flex-col items-center rounded-lg border border-gray-200 bg-white p-6 text-center transition-all hover:border-secondary hover:shadow-md"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 group-hover:bg-gray-200">
              <Home className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Go to Home
            </h3>
            <p className="text-sm text-gray-600">
              Explore the dashboard and see what&apos;s available
            </p>
          </button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Don&apos;t worry - you can always come back to these options later
            from the settings menu.
          </p>
        </div>
      </div>
    </div>
  );
}
