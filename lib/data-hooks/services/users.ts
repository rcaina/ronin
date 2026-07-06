import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from "@/lib/types/user";

export const updateProfile = async (
  data: UpdateProfileRequest,
): Promise<UpdateProfileResponse> => {
  const response = await fetch("/api/users/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as { message: string };
    throw new Error(errorData.message);
  }

  return response.json() as Promise<UpdateProfileResponse>;
};

export const changePassword = async (
  data: ChangePasswordRequest,
): Promise<ChangePasswordResponse> => {
  const response = await fetch("/api/users/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let message = "Failed to change password";
    try {
      const errorData = (await response.json()) as { error?: string };
      message = errorData.error ?? message;
    } catch {
      // non-JSON error body — keep the default message
    }
    throw new Error(message);
  }

  return response.json() as Promise<ChangePasswordResponse>;
};

export const updateTheme = async (
  theme: "light" | "dark" | "system",
): Promise<UpdateProfileResponse> => {
  const response = await fetch("/api/users/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ theme }),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as { message: string };
    throw new Error(errorData.message);
  }

  return response.json() as Promise<UpdateProfileResponse>;
};
