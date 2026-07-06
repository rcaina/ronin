import type {
  SignUpRequest,
  SignInRequest,
  CreateUserRequest,
  SignUpResponse,
  CreateUserResponse,
  DeleteAccountResponse,
  PasswordResetRequestRequest,
  PasswordResetRequestResponse,
  PasswordResetConfirmRequest,
  PasswordResetConfirmResponse,
  LoginCodeRequestRequest,
  LoginCodeRequestResponse,
  SignInWithCodeRequest,
} from "@/lib/types/user";
import { parseErrorResponse } from "./http";
import { signIn as nextAuthSignIn } from "next-auth/react";

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
};

export const requestPasswordReset = async (
  data: PasswordResetRequestRequest,
): Promise<PasswordResetRequestResponse> => {
  const response = await fetch("/api/auth/password-reset/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to request password reset: ${response.statusText}`);
  }

  return response.json() as Promise<PasswordResetRequestResponse>;
};

export const confirmPasswordReset = async (
  data: PasswordResetConfirmRequest,
): Promise<PasswordResetConfirmResponse> => {
  const response = await fetch("/api/auth/password-reset/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let message = "Invalid or expired reset link";
    try {
      const errorData = (await response.json()) as { error?: string };
      message = errorData.error ?? message;
    } catch {
      // non-JSON error body — keep the default message
    }
    throw new Error(message);
  }

  return response.json() as Promise<PasswordResetConfirmResponse>;
};

export const requestLoginCode = async (
  data: LoginCodeRequestRequest,
): Promise<LoginCodeRequestResponse> => {
  const response = await fetch("/api/auth/login-code/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to request login code: ${response.statusText}`);
  }

  return response.json() as Promise<LoginCodeRequestResponse>;
};

export const signInWithCode = async (
  data: SignInWithCodeRequest,
): Promise<void> => {
  const result = await nextAuthSignIn("email-code", {
    email: data.email,
    code: data.code,
    redirect: false,
  });

  if (result?.error) {
    throw new Error("Invalid or expired code");
  }

  if (!result?.ok) {
    throw new Error("Authentication failed");
  }
};

export const createUser = async (
  data: CreateUserRequest,
): Promise<CreateUserResponse> => {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) return parseErrorResponse(response);

  return response.json() as Promise<CreateUserResponse>;
};

export const deleteAccount = async (
  password: string,
): Promise<DeleteAccountResponse> => {
  const response = await fetch("/api/users/delete-account", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as { error?: string };
    throw new Error(errorData.error ?? "Failed to delete account");
  }

  return response.json() as Promise<DeleteAccountResponse>;
};
