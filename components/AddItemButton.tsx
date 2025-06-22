import { Plus } from "lucide-react";

interface AddItemButtonProps {
  onClick: () => void;
  title: string;
  description?: string;
  variant?: "default" | "compact";
}

export default function AddItemButton({
  onClick,
  title,
  description,
  variant = "default",
}: AddItemButtonProps) {
  if (variant === "compact") {
    return (
      <button
        onClick={onClick}
        className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-white p-3 text-left transition-all duration-200 hover:border-gray-400 hover:bg-gray-50"
      >
        <div className="flex items-center justify-center">
          <Plus className="mr-2 h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">{title}</span>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group relative flex h-full w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 text-center transition-all duration-200 hover:border-gray-400 hover:bg-gray-50"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 transition-colors group-hover:bg-gray-200">
        <Plus className="h-6 w-6 text-gray-400 transition-colors group-hover:text-gray-600" />
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      )}
    </button>
  );
}
