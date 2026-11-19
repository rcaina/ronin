"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "@/lib/data-hooks/notifications/useNotifications";
import NotificationPanel from "./NotificationPanel";

interface NotificationBellProps {
  /** `dark` matches the dark SideNav chrome; `light` matches MobileHeader /
   * light surfaces. Defaults to `light`. */
  variant?: "dark" | "light";
  className?: string;
}

/**
 * Bell icon + unread badge, opening `NotificationPanel` on click. Shared
 * between the desktop `SideNav` and mobile `MobileHeader` — see DESIGN.md
 * §10 for the notification bell/panel pattern this introduces.
 */
export default function NotificationBell({
  variant = "light",
  className = "",
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data } = useNotifications();
  const unreadCount = data?.unreadCount ?? 0;

  const colorClasses =
    variant === "dark"
      ? "text-primary-300 hover:bg-white/5 hover:text-white"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900";
  const badgeClasses =
    variant === "dark"
      ? "bg-accent-400 text-primary-950"
      : "bg-secondary text-secondary-foreground";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 ${colorClasses} ${className}`}
      >
        <Bell className="h-5 w-5" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span
            className={`absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none ${badgeClasses}`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <NotificationPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
