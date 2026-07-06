import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmPasswordReset } from "./services/auth";

interface ResetPasswordData {
  email: string;
  token: string;
  password: string;
}

interface UseResetPasswordReturn {
  resetPassword: (data: ResetPasswordData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  resetError: () => void;
}

export function useResetPassword(): UseResetPasswordReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleResetPassword = async (data: ResetPasswordData) => {
    setIsLoading(true);
    setError(null);

    try {
      await confirmPasswordReset(data);
      router.push("/sign-in");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid or expired reset link",
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
    resetPassword: handleResetPassword,
    isLoading,
    error,
    resetError,
  };
}
