import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { changePassword } from "../services/users";

export const useChangePassword = () => {
  return useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success("Password updated");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update password.",
      );
    },
  });
};
