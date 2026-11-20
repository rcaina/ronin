"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import Button from "./Button";
import HeaderActionMenu from "./HeaderActionMenu";
import { useMobileHeaderSlots } from "./MobileHeaderActionContext";
import { isHeaderlessOnMobile } from "@/lib/utils/mobile-nav";

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
  /** Disable every header action while the page behind them is busy. */
  actionsDisabled?: boolean;
}

const PageHeader = ({
  title,
  eyebrow,
  description,
  backButton,
  action,
  actions,
  actionsDisabled = false,
}: PageHeaderProps) => {
  // The primary action is never hidden in a menu: a header button from lg, a +
  // button over the bottom tab bar below it. Secondary actions collapse into a
  // menu on phones.
  const primaryAction =
    action ?? actions?.find((item) => item.variant === "primary");
  const secondaryActions = (actions ?? []).filter(
    (item) => item !== primaryAction,
  );
  const headerless = isHeaderlessOnMobile(usePathname());
  const { menuSlot, leadSlot, shortcutLabel } = useMobileHeaderSlots();
  // The top bar already shows its one-tap shortcut (e.g. Scan receipt) as an icon.
  const menuActions = secondaryActions.filter(
    (item) => item.label !== shortcutLabel,
  );

  return (
    <>
      {headerless && <h1 className="sr-only lg:hidden">{title}</h1>}
      {headerless &&
        leadSlot &&
        backButton &&
        createPortal(
          // The page keeps its sr-only <h1>, so the bar's title is a <p>.
          <div data-mobile-back-bar className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={backButton.onClick}
              className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-600 transition-colors duration-150 ease-brand hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              {eyebrow && (
                <p className="truncate text-xs font-medium text-gray-500">
                  {eyebrow}
                </p>
              )}
              <p className="truncate text-base font-semibold tracking-tight text-gray-900">
                {title}
              </p>
            </div>
          </div>,
          leadSlot,
        )}
      {headerless &&
        menuSlot &&
        menuActions.length > 0 &&
        createPortal(
          <HeaderActionMenu actions={menuActions} disabled={actionsDisabled} />,
          menuSlot,
        )}
      <div
        className={`fixed left-0 right-0 top-16 z-[30] border-b border-gray-200/70 bg-surface-card/90 backdrop-blur-md lg:sticky lg:top-0 ${headerless ? "hidden lg:block" : ""}`}
      >
        {/* Fixed height while the header is position:fixed (below lg) so it never
          grows past its content clearance; natural height once it's sticky on
          desktop, where the description can show. */}
        <div className="mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:h-auto lg:px-8 lg:py-4">
          <div className="flex min-w-0 flex-1 items-center">
            {backButton && (
              <button
                onClick={backButton.onClick}
                className="tap-target mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900 sm:mr-4"
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
          {(primaryAction !== undefined || secondaryActions.length > 0) && (
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {primaryAction && (
                <Button
                  onClick={primaryAction.onClick}
                  disabled={actionsDisabled}
                  variant="primary"
                  className="hidden lg:inline-flex"
                >
                  {primaryAction.icon && (
                    <span className={primaryAction.label ? "mr-2" : ""}>
                      {primaryAction.icon}
                    </span>
                  )}
                  <span>{primaryAction.label}</span>
                </Button>
              )}
              {secondaryActions.length > 0 && (
                <>
                  <div className="sm:hidden">
                    <HeaderActionMenu
                      actions={secondaryActions}
                      disabled={actionsDisabled}
                    />
                  </div>
                  <div className="hidden items-center gap-2 sm:flex sm:gap-3">
                    {secondaryActions.map((actionItem, index) => (
                      <Button
                        key={index}
                        onClick={actionItem.onClick}
                        variant={actionItem.variant ?? "secondary"}
                        disabled={actionsDisabled}
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
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {primaryAction && (
        // Outside the header: its backdrop-filter would make it the containing block for a fixed child.
        <button
          type="button"
          onClick={primaryAction.onClick}
          disabled={actionsDisabled}
          aria-label={primaryAction.label}
          className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lifted transition-colors duration-150 ease-brand enabled:hover:bg-secondary-600 enabled:active:bg-secondary-700 disabled:bg-gray-200 disabled:text-gray-500 sm:right-6 lg:hidden"
          style={{ bottom: "calc(56px + env(safe-area-inset-bottom) + 1rem)" }}
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </>
  );
};

export default PageHeader;
