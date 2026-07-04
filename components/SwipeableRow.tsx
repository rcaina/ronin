"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from "react";

export interface SwipeAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}

interface SwipeableRowProps {
  /** The row's normal content (rendered unchanged on desktop / non-touch). */
  children: ReactNode;
  /** Actions revealed behind the row when swiped left, in left-to-right order. */
  actions: SwipeAction[];
  /** Disables the swipe gesture entirely (e.g. while the row is mid-edit). */
  disabled?: boolean;
  /** Passthrough for the outer wrapper — use this to carry the row's rounding. */
  className?: string;
}

// Width of a single action button. Also its minimum touch target.
const ACTION_WIDTH = 72;
// Cap how far a row can ever reveal, regardless of action count.
const MAX_REVEAL_WIDTH = ACTION_WIDTH * 4;
// Movement (px) before a touch gesture commits to horizontal vs. vertical.
const AXIS_THRESHOLD = 10;
// Fraction of the reveal width a drag must cross to snap open on release.
const OPEN_SNAP_RATIO = 0.5;
// How much a rubber-banded overshoot is damped by.
const RUBBER_BAND_DAMPING = 3;

// Only one swipeable row should be open at a time across the whole app.
// Every mounted row registers a "close me" callback here; opening a row
// closes everyone else's.
const openRowRegistry = new Set<() => void>();

const closeOtherRows = (except: () => void) => {
  openRowRegistry.forEach((close) => {
    if (close !== except) close();
  });
};

type Axis = "horizontal" | "vertical";

interface TouchGestureState {
  startX: number;
  startY: number;
  axis: Axis | null;
}

const SwipeableRow = ({
  children,
  actions,
  disabled = false,
  className = "",
}: SwipeableRowProps) => {
  const [translateX, setTranslateX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const gestureRef = useRef<TouchGestureState | null>(null);
  // True for a short window after a horizontal drag ends, so the synthetic
  // click that browsers fire after touchend doesn't act on row content.
  const didSwipeRef = useRef(false);

  const revealWidth = Math.min(actions.length * ACTION_WIDTH, MAX_REVEAL_WIDTH);

  const close = useCallback(() => {
    setIsDragging(false);
    setTranslateX(0);
    setIsOpen(false);
  }, []);

  // Register/unregister with the shared "one row open at a time" coordinator.
  useEffect(() => {
    openRowRegistry.add(close);
    return () => {
      openRowRegistry.delete(close);
    };
  }, [close]);

  // If this row becomes disabled (e.g. it enters inline-edit mode) while
  // open or mid-drag, snap it closed.
  useEffect(() => {
    if (disabled) close();
  }, [disabled, close]);

  const open = useCallback(() => {
    closeOtherRows(close);
    setIsDragging(false);
    setTranslateX(-revealWidth);
    setIsOpen(true);
  }, [close, revealWidth]);

  const handleTouchStart = (event: ReactTouchEvent) => {
    if (disabled || actions.length === 0) return;
    const touch = event.touches[0];
    if (!touch) return;
    gestureRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      axis: null,
    };
  };

  const handleTouchMove = (event: ReactTouchEvent) => {
    const gesture = gestureRef.current;
    if (!gesture || disabled) return;
    const touch = event.touches[0];
    if (!touch) return;

    const dx = touch.clientX - gesture.startX;
    const dy = touch.clientY - gesture.startY;

    if (gesture.axis === null) {
      if (Math.abs(dx) > AXIS_THRESHOLD || Math.abs(dy) > AXIS_THRESHOLD) {
        gesture.axis = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      }
    }

    // Vertical (or undecided) gestures are left alone so the page scrolls
    // natively — `touch-action: pan-y` on the drag surface keeps the
    // browser from fighting us over it.
    if (gesture.axis !== "horizontal") return;

    didSwipeRef.current = true;
    setIsDragging(true);

    const base = isOpen ? -revealWidth : 0;
    let next = base + dx;

    if (next < -revealWidth) {
      const overshoot = -revealWidth - next;
      next = -revealWidth - overshoot / RUBBER_BAND_DAMPING;
    } else if (next > 0) {
      next = next / RUBBER_BAND_DAMPING;
    }

    setTranslateX(next);
  };

  const handleTouchEnd = () => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    setIsDragging(false);

    if (!gesture || gesture.axis !== "horizontal") {
      return;
    }

    const shouldOpen = translateX < -revealWidth * OPEN_SNAP_RATIO;
    if (shouldOpen) {
      open();
    } else {
      close();
    }

    // Clear the swipe flag after the browser's post-touchend synthetic
    // click has had a chance to fire and be suppressed.
    requestAnimationFrame(() => {
      didSwipeRef.current = false;
    });
  };

  const handleContentClick = (event: ReactMouseEvent) => {
    if (didSwipeRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (isOpen) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  const handleActionClick = (action: SwipeAction) => {
    close();
    action.onClick();
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {actions.length > 0 && (
        <div
          className={`absolute inset-y-0 right-0 flex lg:hidden ${
            isOpen ? "" : "pointer-events-none"
          }`}
          style={{ width: revealWidth }}
          aria-hidden={!isOpen}
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleActionClick(action)}
              tabIndex={isOpen ? 0 : -1}
              style={{ width: ACTION_WIDTH }}
              className={`flex h-full min-w-[44px] flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-150 ${
                action.tone === "danger"
                  ? "bg-red-600 text-white active:bg-red-700"
                  : "bg-primary text-white active:bg-primary-800"
              }`}
              aria-label={action.label}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
      <div
        className={`relative touch-pan-y bg-surface-card ${
          isDragging
            ? ""
            : "transition-transform duration-200 ease-out motion-reduce:transition-none"
        }`}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClickCapture={handleContentClick}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableRow;
