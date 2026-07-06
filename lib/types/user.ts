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

export interface DeleteAccountResponse {
  message: string;
  deletedEntireAccount: boolean;
}

export interface PasswordResetRequestRequest {
  email: string;
}

export interface PasswordResetRequestResponse {
  message: string;
}

export interface PasswordResetConfirmRequest {
  email: string;
  token: string;
  password: string;
}

export interface PasswordResetConfirmResponse {
  message: string;
}

export interface LoginCodeRequestRequest {
  email: string;
}

export interface LoginCodeRequestResponse {
  message: string;
}

export interface SignInWithCodeRequest {
  email: string;
  code: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phone?: string;
  theme?: "light" | "dark" | "system";
}

export interface UpdateProfileResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  theme: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}
