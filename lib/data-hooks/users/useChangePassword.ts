import { useMutation } from "@tanstack/react-query";
import { changePassword } from "../services/users";

export const useChangePassword = () => {
  return useMutation({
    mutationFn: changePassword,
  });
};
