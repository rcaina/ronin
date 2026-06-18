"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Returns a click handler for "back" buttons that takes the user to their
 * actual previous view via browser history. Only when there is no in-app
 * history to return to — e.g. a deep link, a hard refresh, or a freshly
 * opened tab — does it fall back to `fallbackHref`. The fallback should be
 * the page's logical parent so back never strands the user above where they
 * came from (e.g. a budget sub-page falls back to that budget's overview,
 * not all the way out to the budgets list).
 */
export const useBackNavigation = (fallbackHref: string) => {
  const router = useRouter();

  return useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }, [router, fallbackHref]);
};

// Reference count so stacked/sequential modals don't unlock the page while
// another is still open. The "original" values are captured by whichever modal
// acquires the first lock and restored by whichever releases the last one.
let scrollLockCount = 0;
let originalBodyOverflow = "";
let originalHtmlOverflow = "";
let originalBodyPaddingRight = "";

/**
 * Locks scrolling on the page body while `locked` is true.
 *
 * This is what stops touch scrolls from "chaining" to the page behind an open
 * modal on mobile (the glitchy "background scrolls instead of the modal" bug).
 * Pair it with `overflow-y-auto overscroll-contain` on the modal's own scroll
 * container so the modal scrolls but the page underneath stays put.
 */
export const useLockBodyScroll = (locked: boolean): void => {
  useEffect(() => {
    if (!locked) return;

    const { body, documentElement: html } = document;

    if (scrollLockCount === 0) {
      // Compensate for the scrollbar that disappears when we hide overflow so
      // the layout behind the backdrop doesn't shift (desktop only; mobile
      // scrollbars are overlaid and report width 0).
      const scrollbarWidth = window.innerWidth - html.clientWidth;

      originalBodyOverflow = body.style.overflow;
      originalHtmlOverflow = html.style.overflow;
      originalBodyPaddingRight = body.style.paddingRight;

      body.style.overflow = "hidden";
      html.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }
    scrollLockCount += 1;

    return () => {
      scrollLockCount -= 1;
      if (scrollLockCount === 0) {
        body.style.overflow = originalBodyOverflow;
        html.style.overflow = originalHtmlOverflow;
        body.style.paddingRight = originalBodyPaddingRight;
      }
    };
  }, [locked]);
};
