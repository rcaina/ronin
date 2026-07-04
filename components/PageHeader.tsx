import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import Button from "./Button";
import HeaderActionMenu from "./HeaderActionMenu";

interface PageHeaderProps {
  title: string;
  /** Small label shown above the title (e.g. the parent budget/savings name). */
  eyebrow?: string;
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
  eyebrow,
  description,
  backButton,
  action,
  actions,
}: PageHeaderProps) => {
  // Full ordered list of actions (primary `action` first, then `actions`).
  // On mobile, any action(s) collapse into a single kebab menu so the header
  // never renders unlabeled icon buttons; the regular button row still
  // renders normally at sm and up.
  const allActions = [
    ...(action ? [{ ...action, variant: "primary" as const }] : []),
    ...(actions ?? []),
  ];
  const useOverflowMenu = allActions.length >= 1;

  return (
    <div className="fixed left-0 right-0 top-16 z-[30] border-b border-gray-200/70 bg-surface-card/90 backdrop-blur-md lg:sticky lg:top-0">
      {/* Fixed height while the header is position:fixed (below lg) so it never
          grows past its content clearance; natural height once it's sticky on
          desktop, where the description can show. */}
      <div className="mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:h-auto lg:px-8 lg:py-4">
        <div className="flex min-w-0 flex-1 items-center">
          {backButton && (
            <button
              onClick={backButton.onClick}
              className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900 sm:mr-4"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="truncate text-xs font-medium text-gray-500">
                {eyebrow}
              </p>
            )}
            <h1 className="truncate text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 hidden truncate text-sm text-gray-500 lg:block">
                {description}
              </p>
            )}
          </div>
        </div>
        {allActions.length > 0 && (
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {useOverflowMenu && (
              <div className="sm:hidden">
                <HeaderActionMenu actions={allActions} />
              </div>
            )}
            <div
              className={`items-center gap-2 sm:flex sm:gap-3 ${useOverflowMenu ? "hidden" : "flex"}`}
            >
              {action && (
                <Button onClick={action.onClick} variant="primary">
                  {action.icon && (
                    <span className={action.label ? "mr-2" : ""}>
                      {action.icon}
                    </span>
                  )}
                  <span>{action.label}</span>
                </Button>
              )}
              {actions?.map((actionItem, index) => (
                <Button
                  key={index}
                  onClick={actionItem.onClick}
                  variant={actionItem.variant ?? "secondary"}
                >
                  {actionItem.icon && (
                    <span className={actionItem.label ? "mr-2" : ""}>
                      {actionItem.icon}
                    </span>
                  )}
                  <span>{actionItem.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
