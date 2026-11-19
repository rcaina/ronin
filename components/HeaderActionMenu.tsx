"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { EllipsisVertical } from "lucide-react";

export interface HeaderActionMenuItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
}

interface HeaderActionMenuProps {
  actions: HeaderActionMenuItem[];
  disabled?: boolean;
}

// Mobile-only overflow menu for page header actions. Renders a single kebab
// trigger that opens a dropdown listing every action with its icon AND
// label, so actions aren't reduced to unlabeled icon buttons on small
// screens. Styling mirrors the "More" popup in MobileBottomNav and the
// rounded-2xl/shadow-lifted panel pattern used by modals across the app.
const HeaderActionMenu = ({
  actions,
  disabled = false,
}: HeaderActionMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    // A fixed full-screen catcher can't work here: the header's backdrop-filter
    // makes it the containing block, so the catcher would only cover the header.
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  if (actions.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={disabled}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-600 transition-all duration-200 ease-out enabled:hover:bg-gray-100 enabled:hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-300"
        aria-label="Open actions menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <EllipsisVertical className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-56 animate-scale-in overflow-hidden rounded-2xl border border-gray-400/60 bg-surface-card p-1.5 shadow-lifted"
        >
          {actions.map((item, index) => {
            const isDanger = item.variant === "danger";
            return (
              <button
                key={index}
                type="button"
                role="menuitem"
                disabled={disabled}
                onClick={() => {
                  setIsOpen(false);
                  item.onClick();
                }}
                className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition-all duration-200 ease-out ${
                  isDanger
                    ? "text-red-600 hover:bg-red-50"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {item.icon && (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {item.icon}
                  </span>
                )}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HeaderActionMenu;
