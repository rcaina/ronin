import { useState } from "react";
import { requestPasswordReset } from "./services/auth";

interface UseForgotPasswordReturn {
  requestReset: (email: string) => Promise<void>;
  isLoading: boolean;
  isSubmitted: boolean;
  error: string | null;
  resetError: () => void;
}

export function useForgotPassword(): UseForgotPasswordReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestReset = async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await requestPasswordReset({ email });
      setIsSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again.",
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resetError = () => {
    setError(null);
  };

  return {
    requestReset: handleRequestReset,
    isLoading,
    isSubmitted,
    error,
    resetError,
  };
}
