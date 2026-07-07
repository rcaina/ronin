"use client";

import Image from "next/image";
import roninLogo from "@/public/ronin_logo.jpg";
import { useMobileHeaderAction } from "./MobileHeaderActionContext";
import { useFeatureSettings } from "@/lib/data-hooks/accounts/useFeatureSettings";
import { isFeatureEnabled } from "@/lib/utils/features";
import { DEFAULT_FEATURE_SETTINGS } from "@/lib/types/feature-settings";
import NotificationBell from "@/components/notifications/NotificationBell";

// Slim mobile top bar. Primary navigation now lives in the MobileBottomNav;
// this keeps the brand mark up top plus an optional page-registered action
// (e.g. scan receipt) and the notifications bell on the right.
export default function MobileHeader() {
  const { action } = useMobileHeaderAction();
  const { data: featureSettings } = useFeatureSettings();
  const settings = featureSettings ?? DEFAULT_FEATURE_SETTINGS;

  return (
    <div className="fixed left-0 right-0 top-0 z-[60] border-b border-gray-200/70 bg-surface-card/90 backdrop-blur-md lg:hidden">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 flex-shrink-0">
            <Image
              src={roninLogo}
              alt="Ronin Logo"
              width={36}
              height={36}
              className="h-full w-full rounded-full ring-2 ring-secondary/40"
              priority
            />
          </div>
          <h1 className="text-sm font-bold tracking-[0.2em] text-secondary-700">
            RONIN
          </h1>
        </div>

        <div className="flex items-center gap-1">
          {/* Page-registered action (e.g. scan receipt) */}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              aria-label={action.label}
              title={action.label}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-gray-600 transition-all duration-200 ease-out hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              {action.icon}
            </button>
          )}

          {isFeatureEnabled(settings, "notifications") && <NotificationBell />}
        </div>
      </div>
    </div>
  );
}
