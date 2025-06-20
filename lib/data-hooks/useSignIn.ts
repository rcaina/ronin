import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, type SignInRequest } from "./services/auth";

interface UseSignInReturn {
  signIn: (data: SignInRequest) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  resetError: () => void;
}

export function useSignIn(): UseSignInReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignIn = async (data: SignInRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      await signIn(data);
      
      // Redirect to the main page on successful sign-in
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred during sign in"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetError = () => {
    setError(null);
  };

  return {
    signIn: handleSignIn,
    isLoading,
    error,
    resetError,
  };
} 