import { useState } from "react";
import { signOut } from "next-auth/react";
import { deleteAccount } from "./services/auth";

interface UseDeleteAccountReturn {
  deleteAccount: (password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  resetError: () => void;
}

export function useDeleteAccount(): UseDeleteAccountReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async (password: string) => {
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
          : "An error occurred during account deletion"
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
    deleteAccount: handleDeleteAccount,
    isLoading,
    error,
    resetError,
  };
}
