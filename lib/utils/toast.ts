import { toast } from "react-hot-toast";

export const showToast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast(message, { icon: "⚠️" }),
  info: (message: string) => toast(message, { icon: "ℹ️" }),
  loading: (message: string) => toast.loading(message),
  dismiss: (toastId: string) => toast.dismiss(toastId),
};

export const showPromiseToast = async <T>(
  promise: Promise<T>,
  {
    loading = "Loading...",
    success = "Success!",
    error = "Something went wrong",
  }: {
    loading?: string;
    success?: string;
    error?: string;
  } = {}
): Promise<T> => {
  const toastId = toast.loading(loading);
  
  try {
    const result = await promise;
    toast.success(success, { id: toastId });
    return result;
  } catch (err) {
    toast.error(error, { id: toastId });
    throw err;
  }
}; 