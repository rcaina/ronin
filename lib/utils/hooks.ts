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
