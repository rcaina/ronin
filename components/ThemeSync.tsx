"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";

/**
 * Bridges the user's saved theme preference (persisted on the User record and
 * carried in the session) into next-themes on load. next-themes already restores
 * the per-device choice from localStorage with no flash; this reconciles that with
 * the account-level preference so it follows the user across devices.
 *
 * Runs once per authenticated session — after mount the user drives the theme via
 * the Preferences tab, which calls setTheme directly and persists the change.
 */
export default function ThemeSync() {
  const { data: session, status } = useSession();
  const { setTheme } = useTheme();
  const synced = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || synced.current) return;
    const saved = session?.user?.theme;
    if (saved === "light" || saved === "dark" || saved === "system") {
      setTheme(saved);
    }
    synced.current = true;
  }, [status, session?.user?.theme, setTheme]);

  return null;
}
