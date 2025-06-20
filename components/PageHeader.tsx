import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
}

const PageHeader = ({ title, description, action }: PageHeaderProps) => {
  return (
    <div className="border-b bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            {description && <p className="mt-1 text-gray-500">{description}</p>}
          </div>
          {action && (
            <button
              onClick={action.onClick}
              className="inline-flex items-center rounded-lg bg-secondary px-4 py-2 text-black/90 shadow-sm transition-colors hover:bg-blue-700"
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
