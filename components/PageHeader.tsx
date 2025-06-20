import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  backButton?: {
    onClick: () => void;
  };
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
}

const PageHeader = ({
  title,
  description,
  backButton,
  action,
}: PageHeaderProps) => {
  return (
    <div className="border-b bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {backButton && (
              <button
                onClick={backButton.onClick}
                className="mr-4 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              {description && (
                <p className="mt-1 text-gray-500">{description}</p>
              )}
            </div>
          </div>
          {action && (
            <button
              onClick={action.onClick}
              className="inline-flex items-center rounded-lg bg-secondary px-4 py-2 text-black/90 shadow-sm transition-colors hover:bg-yellow-300"
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
