import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { updateProfile } from "../services/users";

export const useUpdateProfile = () => {
  const { update: updateSession } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    mutationFn: updateProfile,
    onSuccess: (updatedUser: { name: string; email: string | null; phone: string | null }) => {
      // Update the session with the new user data
      if (updateSession) {
        void updateSession({
          user: {
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
          },
        });
      }

      // Invalidate and refetch user-related queries if any exist
      void queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};
