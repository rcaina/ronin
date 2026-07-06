import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { confirmPasswordReset } from "./services/auth";
import type { PasswordResetConfirmRequest } from "@/lib/types/user";

interface UseResetPasswordReturn {
  resetPassword: (data: PasswordResetConfirmRequest) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  resetError: () => void;
}

export function useResetPassword(): UseResetPasswordReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleResetPassword = async (data: PasswordResetConfirmRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      await confirmPasswordReset(data);
      toast.success("Password reset. You can sign in now.");
      router.push("/sign-in");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Invalid or expired reset link";
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
    resetPassword: handleResetPassword,
    isLoading,
    error,
    resetError,
  };
}
