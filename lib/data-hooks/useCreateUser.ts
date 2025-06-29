import { useState } from "react";
import { createUser, type CreateUserRequest } from "./services/auth";
import type { User } from "@prisma/client";

interface UseCreateUserReturn {
  createUser: (data: CreateUserRequest) => Promise<{ user: User & { name: string } }>;
  isLoading: boolean;
  error: string | null;
  resetError: () => void;
}

export function useCreateUser(): UseCreateUserReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateUser = async (data: CreateUserRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await createUser(data);
      return { user: result.user };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred while creating user";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resetError = () => {
    setError(null);
  };

  return {
    createUser: handleCreateUser,
    isLoading,
    error,
    resetError,
  };
} 