"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Gap between the icon and the bubble, and minimum gap to the viewport edge.
const BUBBLE_OFFSET = 8;
const VIEWPORT_MARGIN = 8;

/**
 * Icon-button tooltip. Shows on hover for pointer devices and toggles on tap
 * for touch devices (Safari doesn't focus buttons on tap, so hover/focus
 * alone isn't enough). The bubble renders through a portal with fixed
 * positioning so `overflow-hidden` ancestors (SwipeableRow, card containers)
 * can't clip it, and it is nudged horizontally to stay inside the viewport
 * while the arrow stays anchored to the icon.
 */
const IconTooltip = ({
  label,
  content,
  icon,
  className,
}: {
  label: string;
  content: string;
  icon: ReactNode;
  /** Merged onto the icon button's base classes, e.g. to change the color. */
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    arrowLeft: number;
    placement: "above" | "below";
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  const isVisible = isOpen || isHovered || isFocused;

  // The bubble mounts hidden so it can be measured, then is placed above the
  // icon before the browser paints.
  useLayoutEffect(() => {
    if (!isVisible) {
      setPosition(null);
      return;
    }
    const button = buttonRef.current;
    const bubble = bubbleRef.current;
    if (!button || !bubble) return;
    const anchor = button.getBoundingClientRect();
    const { width, height } = bubble.getBoundingClientRect();
    const anchorCenter = anchor.left + anchor.width / 2;
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(
        anchorCenter - width / 2,
        window.innerWidth - VIEWPORT_MARGIN - width,
      ),
    );
    // Prefer above the icon; flip below when the bubble would overflow the top
    // of the viewport (e.g. an icon in the first visible row on mobile).
    const topAbove = anchor.top - height - BUBBLE_OFFSET;
    const placement = topAbove < VIEWPORT_MARGIN ? "below" : "above";
    setPosition({
      left,
      top: placement === "below" ? anchor.bottom + BUBBLE_OFFSET : topAbove,
      arrowLeft: anchorCenter - left,
      placement,
    });
  }, [isVisible]);

  // A fixed-position bubble doesn't follow its row when the page or an inner
  // list scrolls, so close instead of drifting.
  useEffect(() => {
    if (!isVisible) return;
    const close = () => {
      setIsOpen(false);
      setIsHovered(false);
    };
    window.addEventListener("scroll", close, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", close, { capture: true });
  }, [isVisible]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        aria-describedby={isVisible ? tooltipId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsOpen(false);
          setIsHovered(false);
          setIsFocused(false);
        }}
        // iOS fires a sticky mouseenter on tap, which would keep the bubble
        // open (and aria-expanded stale) after a second tap closes isOpen —
        // so only treat non-touch pointers as hover.
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") setIsHovered(true);
        }}
        onPointerLeave={() => setIsHovered(false)}
        // -m-3.5/p-3.5 grows the 16px icon's hit area to the 44px minimum tap
        // target without changing its layout footprint.
        className={cn(
          "-m-3.5 flex flex-shrink-0 items-center justify-center rounded-full p-3.5 text-gray-400",
          className,
        )}
      >
        {icon}
      </button>
      {isVisible &&
        createPortal(
          <div
            ref={bubbleRef}
            id={tooltipId}
            role="tooltip"
            style={
              position
                ? { left: position.left, top: position.top }
                : { left: 0, top: 0, visibility: "hidden" }
            }
            className="pointer-events-none fixed z-50 w-max max-w-[calc(100vw-1rem)] animate-fade-in break-words rounded-xl bg-primary-950/90 px-3 py-2 text-sm text-white shadow-lifted sm:max-w-xs"
          >
            {content}
            <div
              style={position ? { left: position.arrowLeft } : undefined}
              className={cn(
                "absolute h-0 w-0 -translate-x-1/2 border-l-4 border-r-4 border-transparent",
                position?.placement === "below"
                  ? "bottom-full border-b-4 border-b-primary-950/90"
                  : "top-full border-t-4 border-t-primary-950/90",
              )}
            />
          </div>,
          document.body,
        )}
    </>
  );
};

export default IconTooltip;
