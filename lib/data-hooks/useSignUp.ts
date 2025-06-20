import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signUp, type SignUpRequest } from "./services/auth";

interface UseSignUpReturn {
  signUp: (data: SignUpRequest) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  resetError: () => void;
}

export function useSignUp(): UseSignUpReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignUp = async (data: SignUpRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      // Create the user account
      await signUp(data);

      // Sign in the user after successful registration
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Failed to sign in after registration");
        return;
      }

      // Redirect to the main page
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred during sign up"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetError = () => {
    setError(null);
  };

  return {
    signUp: handleSignUp,
    isLoading,
    error,
    resetError,
  };
} 