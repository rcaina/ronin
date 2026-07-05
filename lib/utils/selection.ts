import type { KeyboardEvent } from "react";

interface SelectableTileOptions {
  /** While true the tile behaves as a checkbox instead of its normal action. */
  selectionMode: boolean;
  selected: boolean;
  /** Tile can't be toggled (e.g. the user doesn't own it) — rendered inert. */
  disabled?: boolean;
  /** Accessible name for the checkbox, e.g. `Select Groceries`. */
  label?: string;
  onToggle: () => void;
  /** Click-through action outside selection mode (e.g. navigate to detail). */
  onActivate?: () => void;
}

/**
 * Shared click/keyboard/ARIA wiring for card-style tiles that double as
 * checkboxes while a "merge" selection mode is active. Used by both the cards
 * and categories tiles so the two merge flows expose identical semantics:
 * checkbox role + Enter/Space toggling in selection mode, button semantics
 * for the normal click-through path.
 */
export const getSelectableTileProps = ({
  selectionMode,
  selected,
  disabled = false,
  label,
  onToggle,
  onActivate,
}: SelectableTileOptions) => {
  const onEnterOrSpace =
    (action: () => void) => (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        action();
      }
    };

  if (selectionMode) {
    return {
      role: "checkbox" as const,
      "aria-checked": selected,
      "aria-disabled": disabled || undefined,
      "aria-label": label,
      tabIndex: disabled ? undefined : 0,
      onClick: disabled ? undefined : onToggle,
      onKeyDown: disabled ? undefined : onEnterOrSpace(onToggle),
    };
  }

  if (!onActivate) return {};

  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: onEnterOrSpace(onActivate),
  };
};
