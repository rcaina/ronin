"use client";

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { useLockBodyScroll } from "@/lib/utils/hooks";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Renders a header row with the title and an X close button. */
  title?: string;
  /**
   * Accessible name for the dialog when no `title` header is rendered (e.g.
   * dialogs with fully custom chrome). Ignored when `title` is set, which
   * already names the dialog via `aria-labelledby`.
   */
  ariaLabel?: string;
  children: ReactNode;
  /**
   * `dialog` is the canonical centered modal. `sheet` is a bottom sheet on
   * mobile (below `sm`) that becomes an identical centered dialog at `sm`
   * and up.
   */
  variant?: "dialog" | "sheet";
  /** Applied at the dialog breakpoint (always for `dialog`, `sm:` and up for `sheet`). */
  maxWidth?: string;
  /** Rendered pinned below the scrollable body, e.g. a Clear/Save button row. */
  footer?: ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => el.offsetParent !== null);
}

export default function Modal({
  isOpen,
  onClose,
  title,
  ariaLabel,
  children,
  variant = "dialog",
  maxWidth = "max-w-md",
  footer,
}: ModalProps) {
  useLockBodyScroll(isOpen);

  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Focus management: move focus into the panel on open, restore whatever
  // had focus before the modal opened once it closes.
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    if (panel) {
      const [firstFocusable] = getFocusableElements(panel);
      (firstFocusable ?? panel).focus();
    }

    return () => {
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Trap Tab/Shift+Tab within the panel.
  const handleTabKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusable = getFocusableElements(panel);
    if (focusable.length === 0) {
      e.preventDefault();
      panel.focus();
      return;
    }

    const first = focusable.at(0);
    const last = focusable.at(-1);
    if (!first || !last) return;
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || active === panel) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const backdropClasses =
    variant === "sheet"
      ? "fixed inset-0 z-[70] flex items-end justify-center bg-primary-950/40 backdrop-blur-sm sm:items-center sm:p-4"
      : "fixed inset-0 z-[70] flex items-center justify-center bg-primary-950/40 p-4 backdrop-blur-sm";

  // The `sm:max-w-md` combo below must stay a literal string (rather than
  // `` `sm:${maxWidth}` ``) so Tailwind's static content scan can see it —
  // dynamically-built responsive class names aren't detected at build time.
  const sheetDesktopMaxWidthClass =
    maxWidth === "max-w-md" ? "sm:max-w-md" : maxWidth;

  // `motion-reduce:animate-none` mirrors the reduced-motion override that
  // globals.css already applies to `.animate-scale-in` (see the
  // `prefers-reduced-motion` block there) so `slide-up` gets the same
  // treatment without needing a matching entry in that global stylesheet.
  const panelShapeClasses =
    variant === "sheet"
      ? `w-full animate-slide-up rounded-t-2xl motion-reduce:animate-none sm:animate-scale-in sm:rounded-2xl ${sheetDesktopMaxWidthClass}`
      : `w-full animate-scale-in rounded-2xl motion-reduce:animate-none ${maxWidth}`;

  const panelHeightClasses =
    variant === "sheet"
      ? "max-h-[85dvh] sm:max-h-[calc(100dvh-2rem)]"
      : "max-h-[calc(100dvh-2rem)]";

  const hasChrome = Boolean(title) || Boolean(footer);

  return (
    <div className={backdropClasses} onClick={handleBackdropClick}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        onKeyDown={handleTabKey}
        className={`flex flex-col border border-gray-400/60 bg-surface-card shadow-lifted outline-none ${panelShapeClasses} ${panelHeightClasses} ${
          hasChrome
            ? "overflow-hidden"
            : "overflow-y-auto overscroll-contain p-6"
        }`}
      >
        {variant === "sheet" && (
          <div
            aria-hidden="true"
            className="mx-auto mt-2 h-1.5 w-10 flex-shrink-0 rounded-full bg-gray-300 sm:hidden"
          />
        )}

        {title && (
          <div className="flex flex-shrink-0 items-center justify-between gap-3 px-6 pb-4 pt-4">
            <h3
              id={titleId}
              className="text-lg font-semibold tracking-tight text-gray-900"
            >
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${title}`}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {hasChrome ? (
          <div
            className={`flex-1 overflow-y-auto overscroll-contain px-6 pb-6 ${
              title ? "" : "pt-6"
            }`}
          >
            {children}
          </div>
        ) : (
          children
        )}

        {footer && (
          <div className="flex-shrink-0 border-t border-gray-100 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
