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
  defaultPassword: string;
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