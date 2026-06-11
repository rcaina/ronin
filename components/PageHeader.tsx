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
  actions?: Array<{
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  }>;
}

const PageHeader = ({
  title,
  description,
  backButton,
  action,
  actions,
}: PageHeaderProps) => {
  return (
    <div className="fixed left-0 right-0 top-16 z-[30] border-b border-gray-200/70 bg-white/90 backdrop-blur-md lg:sticky lg:top-0">
      <div className="mx-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center">
            {backButton && (
              <button
                onClick={backButton.onClick}
                className="mr-3 flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900 sm:mr-4"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
                {title}
              </h1>
              {description && (
                <p className="mt-0.5 text-sm text-gray-500">{description}</p>
              )}
            </div>
          </div>
          {(action ?? actions) && (
            <div className="flex w-full flex-row items-center justify-end gap-2 sm:w-auto sm:gap-3">
              {action && (
                <Button
                  onClick={action.onClick}
                  variant="primary"
                  className="w-full sm:w-auto"
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </Button>
              )}
              {actions?.map((actionItem, index) => (
                <Button
                  key={index}
                  onClick={actionItem.onClick}
                  variant={actionItem.variant ?? "secondary"}
                  className="w-auto shrink-0 sm:w-auto"
                >
                  {actionItem.icon && (
                    <span className={actionItem.label ? "sm:mr-2" : ""}>
                      {actionItem.icon}
                    </span>
                  )}
                  <span className="hidden sm:inline">{actionItem.label}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
