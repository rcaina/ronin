import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import Button from "./Button";

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
    <div className="sticky top-0 z-10 border-b bg-white shadow-sm">
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
            <Button onClick={action.onClick} variant="primary">
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
