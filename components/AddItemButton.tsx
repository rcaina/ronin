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
        className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-surface-card p-3 text-left transition-all duration-200 ease-out hover:border-secondary hover:bg-secondary/5 active:scale-[0.98]"
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
      className="group relative flex h-full w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-surface-card p-6 text-center transition-all duration-200 ease-out hover:border-secondary hover:bg-secondary/5 active:scale-[0.98]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-gray-400 transition-colors duration-200 group-hover:bg-secondary/15 group-hover:text-secondary-700">
        <Plus className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-gray-900">
        {title}
      </h3>
      {description && (
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      )}
    </button>
  );
}
