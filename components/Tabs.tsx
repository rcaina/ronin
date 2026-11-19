"use client";

import { type KeyboardEvent, useEffect, useRef } from "react";
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
  /** Id of the panel these tabs switch. Set it to get ARIA tablist semantics; leave it off for filters. */
  panelId?: string;
  className?: string;
}

const tabId = (panelId: string, id: string) => `${panelId}-tab-${id}`;

/** Props for the panel a `panelId` tab strip controls. */
export function tabPanelProps(panelId: string, value: string) {
  return {
    id: panelId,
    role: "tabpanel",
    "aria-labelledby": tabId(panelId, value),
    tabIndex: 0,
  } as const;
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

/** Scroll a horizontal strip so its selected item is centred, without moving the page. */
export function centerSelected(strip: HTMLElement) {
  const selected = strip.querySelector<HTMLElement>("[data-selected]");
  if (!selected) return;
  strip.scrollLeft =
    selected.offsetLeft -
    strip.offsetLeft -
    (strip.clientWidth - selected.offsetWidth) / 2;
}

export default function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  size = "default",
  scroll = false,
  panelId,
  className,
}: TabsProps<T>) {
  const compact = size === "compact";
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scroll && stripRef.current) centerSelected(stripRef.current);
  }, [scroll, value]);

  // Roving tabindex: fall back to the first tab so the strip stays reachable when `value` isn't listed.
  const index = Math.max(
    0,
    items.findIndex((item) => item.id === value),
  );

  // Arrow keys move between tabs and select the one focused.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const last = items.length - 1;
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = index === last ? 0 : index + 1;
        break;
      case "ArrowLeft":
        next = index === 0 ? last : index - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    const target = items[next];
    if (!target || !panelId) return;
    event.preventDefault();
    onChange(target.id);
    document.getElementById(tabId(panelId, target.id))?.focus();
  };

  return (
    <div
      ref={stripRef}
      role={panelId ? "tablist" : "group"}
      aria-label={ariaLabel}
      onKeyDown={panelId ? handleKeyDown : undefined}
      className={cn(
        "flex",
        scroll ? "scrollbar-hide overflow-x-auto" : "flex-wrap",
        // Inset shadow, not a border: a scrolling strip clips a child overlapping its border.
        compact && "shadow-[inset_0_-1px_0_rgb(var(--gray-200))]",
        className,
      )}
    >
      {items.map((item, i) => {
        const selected = item.id === value;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            {...(panelId
              ? {
                  id: tabId(panelId, item.id),
                  role: "tab",
                  "aria-selected": selected,
                  "aria-controls": panelId,
                  tabIndex: i === index ? 0 : -1,
                }
              : { "aria-pressed": selected })}
            data-selected={selected || undefined}
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
