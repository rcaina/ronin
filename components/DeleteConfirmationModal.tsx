import { AlertTriangle } from "lucide-react";
import Button from "./Button";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName: string;
  isLoading?: boolean;
  loadingText?: string;
  confirmText?: string;
  cancelText?: string;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  isLoading = false,
  loadingText = "Deleting...",
  confirmText = "Delete",
  cancelText = "Cancel",
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-scale-in rounded-2xl bg-white p-6 shadow-lifted">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-gray-900">
            {title}
          </h3>
        </div>
        <p className="mb-6 text-sm text-gray-500">
          {message.replace("{itemName}", itemName)}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? loadingText : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
