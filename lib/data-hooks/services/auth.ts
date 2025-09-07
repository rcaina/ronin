import type { Role, User } from "@prisma/client";

export interface SignUpRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: Role;
}

export interface SignUpResponse {
  message: string;
  user: User & {
    name: string;
  };
  account: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface CreateUserResponse {
  message: string;
  user: User & {
    name: string;
  };
}

export const signUp = async (data: SignUpRequest): Promise<SignUpResponse> => {
  const response = await fetch("/api/sign-up", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create account: ${response.statusText}`);
  }

  return response.json() as Promise<SignUpResponse>;
};

export const signIn = async (data: SignInRequest): Promise<void> => {
  try {
    const { signIn: nextAuthSignIn } = await import("next-auth/react");
        
    const result = await nextAuthSignIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      throw new Error("Invalid credentials");
    }
    
    if (!result?.ok) {
      throw new Error("Authentication failed");
    }
    
  } catch (error) {
    throw error;
  }
};

export const createUser = async (data: CreateUserRequest): Promise<CreateUserResponse> => {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create user: ${response.statusText}`);
  }

  return response.json() as Promise<CreateUserResponse>;
};

export interface DeleteAccountResponse {
  message: string;
  deletedEntireAccount: boolean;
}

export const deleteAccount = async (password: string): Promise<DeleteAccountResponse> => {
  const response = await fetch("/api/users/delete-account", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const errorData = await response.json() as { error?: string };
    throw new Error(errorData.error ?? "Failed to delete account");
  }

  return response.json() as Promise<DeleteAccountResponse>;
}; 