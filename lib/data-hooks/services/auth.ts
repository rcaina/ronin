import { z } from "zod";

// Validation schema for sign-up request
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const signUpSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Validation schema for sign-in request
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Error response schema
const errorResponseSchema = z.object({
  message: z.string().optional(),
  errors: z.array(z.any()).optional(),
});

// Response schema for sign-up
const signUpResponseSchema = z.object({
  message: z.string(),
  user: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  account: z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

export type SignUpRequest = z.infer<typeof signUpSchema>;
export type SignInRequest = z.infer<typeof signInSchema>;
export type SignUpResponse = z.infer<typeof signUpResponseSchema>;

export const signUp = async (data: SignUpRequest): Promise<SignUpResponse> => {
  const response = await fetch("/api/sign-up", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json() as unknown;
    const parsedError = errorResponseSchema.safeParse(errorData);
    const errorMessage = parsedError.success 
      ? parsedError.data.message ?? "Failed to create account"
      : "Failed to create account";
    throw new Error(errorMessage);
  }

  const result = await response.json() as unknown;
  return signUpResponseSchema.parse(result);
};

export const signIn = async (data: SignInRequest): Promise<void> => {
  // Note: This is a wrapper around NextAuth's signIn for consistency
  // The actual authentication is handled by NextAuth
  const { signIn: nextAuthSignIn } = await import("next-auth/react");
  
  const result = await nextAuthSignIn("credentials", {
    email: data.email,
    password: data.password,
    redirect: false,
  });

  if (result?.error) {
    throw new Error("Invalid credentials");
  }
}; 