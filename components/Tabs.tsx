"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
  icon?: LucideIcon;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  /** `compact` is the small range strip that sits over a chart. */
  size?: "default" | "compact";
  /** Scroll sideways instead of wrapping. Only for strips that aren't the sole route to a view. */
  scroll?: boolean;
  className?: string;
}

/** Underline-tab styling, shared with route tab rows that render `Link`s. */
export function tabClassName(selected: boolean, compact = false) {
  return cn(
    // Inset ring: an outset outline gets clipped by a scrolling strip.
    "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap transition-colors duration-150 ease-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary",
    compact
      ? "border-b px-3 text-xs lg:min-h-8"
      : "border-b-2 px-3 text-base font-medium",
    selected
      ? cn("border-gray-900 text-gray-900", compact && "font-semibold")
      : "border-transparent text-gray-500 hover:text-gray-900",
  );
}

export default function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  size = "default",
  scroll = false,
  className,
}: TabsProps<T>) {
  const compact = size === "compact";

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "flex",
        scroll ? "scrollbar-hide overflow-x-auto" : "flex-wrap",
        // Inset shadow, not a border: a scrolling strip clips a child overlapping its border.
        compact && "shadow-[inset_0_-1px_0_rgb(var(--gray-200))]",
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.id === value;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(item.id)}
            className={tabClassName(selected, compact)}
          >
            {Icon && <Icon className={compact ? "h-3 w-3" : "h-4 w-4"} />}
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  selected ? "text-gray-900" : "text-gray-500",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
