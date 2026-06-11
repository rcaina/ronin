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

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phone?: string;
}

export interface UpdateProfileResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}
