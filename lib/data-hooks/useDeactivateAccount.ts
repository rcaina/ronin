import { useState } from "react";
import { signOut } from "next-auth/react";
import { deleteAccount } from "./services/auth";

interface UseDeactivateAccountReturn {
  leaveAccount: (password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  resetError: () => void;
}

export function useLeaveAccount(): UseDeactivateAccountReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLeaveAccount = async (password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await deleteAccount(password);
      
      // Sign out the user and redirect to sign-in page
      await signOut({ callbackUrl: "/sign-in" });
      
      return;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while leaving the account"
      );
      throw err; // Re-throw to allow the component to handle it
    } finally {
      setIsLoading(false);
    }
  };

  const resetError = () => {
    setError(null);
  };

  return {
    leaveAccount: handleLeaveAccount,
    isLoading,
    error,
    resetError,
  };
}
