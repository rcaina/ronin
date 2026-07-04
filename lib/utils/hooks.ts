"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * `useState` that persists its value to `localStorage`, read back on next
 * visit. SSR-safe: the lazy initializer only touches `window`/`localStorage`
 * when running in the browser, so it's safe to call from `"use client"`
 * pages rendered on the server first.
 *
 * `isValid` guards against corrupt/stale/foreign values in storage (e.g. an
 * old enum member that no longer exists) — when it returns false the
 * `defaultValue` is used instead.
 */
export const useLocalStorageState = <T>(
  key: string,
  defaultValue: T,
  isValid: (value: unknown) => value is T,
): [T, (value: T) => void] => {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = window.localStorage.getItem(key);
      if (stored === null) return defaultValue;
      const parsed: unknown = JSON.parse(stored);
      return isValid(parsed) ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setPersistedValue = useCallback(
    (next: T) => {
      setValue(next);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Ignore write failures (e.g. private browsing storage limits).
        }
      }
    },
    [key],
  );

  return [value, setPersistedValue];
};

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
