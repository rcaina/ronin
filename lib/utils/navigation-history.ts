"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "ronin-nav-history";
const MAX_ENTRIES = 50;

/**
 * Reads the tracked pathname stack from sessionStorage. Guarded against
 * private-mode/quota errors and malformed data — any failure is treated as
 * an empty stack rather than thrown.
 */
export const readStack = (): string[] => {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (
      !Array.isArray(parsed) ||
      !parsed.every((entry) => typeof entry === "string")
    ) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
};

/**
 * Writes the pathname stack to sessionStorage, capping it at `MAX_ENTRIES`
 * (dropping the oldest entries first). Guarded against private-mode/quota
 * errors, which are silently ignored.
 */
export const writeStack = (stack: string[]): void => {
  try {
    const capped =
      stack.length > MAX_ENTRIES ? stack.slice(stack.length - MAX_ENTRIES) : stack;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  } catch {
    // Ignore private-mode/quota errors — worst case, scoped back falls back
    // to the parent href instead of the true previous page.
  }
};

/**
 * Tracks every route change into a sessionStorage-backed pathname stack, so
 * `useBackNavigation` can look up the page the user actually came from
 * without relying on the browser's opaque history API. Call this once, high
 * in the app shell, so it runs on every navigation regardless of section.
 */
export const useTrackNavigationHistory = (): void => {
  const pathname = usePathname();

  useEffect(() => {
    const stack = readStack();
    const top = stack[stack.length - 1];

    if (top === pathname) {
      // Already the top entry — dedupe. This also absorbs the re-render
      // after our own back handler pushes the candidate pathname.
      return;
    }

    if (stack.length >= 2 && stack[stack.length - 2] === pathname) {
      // The user navigated to the entry just below the top — a browser/OS
      // back gesture. Pop instead of pushing so the stack mirrors reality;
      // otherwise a subsequent in-app back would send them "forward" again.
      writeStack(stack.slice(0, -1));
      return;
    }

    writeStack([...stack, pathname]);
  }, [pathname]);
};

/**
 * Returns a click handler for "back" buttons that returns the user to the
 * page they actually came from — but only if that page is within the same
 * scope (e.g. the same budget). If the previous page is outside the scope
 * (a different budget, the section's list page, the dashboard, etc.) it
 * falls back to `fallbackHref`.
 *
 * We deliberately do NOT use `router.back()` / raw browser history here.
 * The browser gives no way to inspect the previous entry's URL before
 * committing to it, and `window.history.length` is > 1 in virtually every
 * real session, so a history-based back would almost always fire — even
 * when the previous entry belongs to a *different* entity (a sibling
 * budget, savings account, or card) reached via the bottom nav, the OS back
 * gesture on a PWA, or mixed use of the back button. That stranded users in
 * the wrong budget: open budget A, then budget B, navigate B's tabs, hit
 * back, and land in A. Maintaining our own pathname stack (see
 * `useTrackNavigationHistory`) lets us inspect the candidate destination
 * and only take it when it's actually still within `scopePrefix`.
 *
 * @param fallbackHref - where to go when there's no in-scope previous page.
 * @param scopePrefix - if provided, the previous page is only used when its
 *   pathname starts with this prefix; otherwise any previous page qualifies
 *   (pure history behavior, still with a safe fallback).
 */
export const useBackNavigation = (
  fallbackHref: string,
  scopePrefix?: string,
) => {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(() => {
    const stack = readStack();
    const top = stack[stack.length - 1];

    // The current page should be the top entry, and the candidate is the
    // one below it. Defensively handle the case where the top isn't the
    // current pathname (e.g. the tracker hasn't run yet this tick) by
    // treating the last entry itself as the candidate — in that case the
    // current page was never pushed, so only the candidate needs popping.
    const topIsCurrent = top === pathname;
    const candidate = topIsCurrent ? stack[stack.length - 2] : top;

    // Scope match must respect path-segment boundaries: "/budgets/abc" must
    // not match "/budgets/abc2/..." (a different budget whose id shares the
    // prefix) — only "/budgets/abc" itself or "/budgets/abc/...".
    const inScope =
      scopePrefix === undefined ||
      candidate === scopePrefix ||
      candidate?.startsWith(`${scopePrefix}/`) === true;

    if (candidate !== undefined && candidate !== pathname && inScope) {
      // Remove the current entry (when present) and the candidate we're
      // navigating to — the tracker effect will re-append the candidate as
      // it mounts, leaving it as the new top. Net effect: one entry popped.
      writeStack(stack.slice(0, topIsCurrent ? -2 : -1));
      router.push(candidate);
      return;
    }

    // No in-scope previous page — pop the current entry (when present) and
    // fall back to the logical parent.
    writeStack(topIsCurrent ? stack.slice(0, -1) : stack);
    router.push(fallbackHref);
  }, [router, pathname, fallbackHref, scopePrefix]);
};
