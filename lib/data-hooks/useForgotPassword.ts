import { useState } from "react";
import { toast } from "react-hot-toast";
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
      toast.success("Check your inbox for a reset link.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again.";
      setError(message);
      toast.error(message);
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
