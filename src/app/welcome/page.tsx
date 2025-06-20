"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useBudgets } from "@/lib/data-hooks/budgets/useBudgets";

export default function WelcomePage() {
  const { status } = useSession();
  const router = useRouter();
  const { data: budgets = [], isLoading } = useBudgets();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (status === "loading" || isLoading) return;

    // If user has budgets, redirect to overview
    if (budgets.length > 0) {
      router.push("/");
      return;
    }

    // If user has no budgets, redirect to setup
    if (budgets.length === 0) {
      router.push("/setup/budget");
      return;
    }

    setIsChecking(false);
  }, [status, isLoading, budgets.length, router]);

  if (status === "loading" || isLoading || isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="relative mx-auto mb-6 h-24 w-24">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-full w-full animate-pulse text-secondary"
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
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Welcome to Ronin
          </h2>
          <p className="text-gray-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return null;
}
