"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";
import roninLogo from "@/public/ronin_logo.jpg";
import { useMobileHeaderAction } from "./MobileHeaderActionContext";
import MobileNavDrawer from "./MobileNavDrawer";
import { useFeatureSettings } from "@/lib/data-hooks/accounts/useFeatureSettings";
import { isFeatureEnabled } from "@/lib/utils/features";
import { DEFAULT_FEATURE_SETTINGS } from "@/lib/types/feature-settings";
import NotificationBell from "@/components/notifications/NotificationBell";
import { isMobileTabRoot } from "@/lib/utils/mobile-nav";
import { useBackNavigation } from "@/lib/utils/navigation-history";

const ICON_BUTTON =
  "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-gray-600 transition-colors duration-150 ease-brand hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2";

// Slim mobile top bar. Tab roots show the logo, the page's shortcut (e.g. scan
// receipt) and the bell; other pages show a back button and the centered title
// PageHeader portals in (its back button, with the page's own handler, replaces
// the fallback one here). Every page ends with its actions menu and the ☰
// drawer of non-tab pages.
export default function MobileHeader() {
  const { action, setMenuSlot, setLeadSlot, setTitleSlot } =
    useMobileHeaderAction();
  const { data: featureSettings } = useFeatureSettings();
  const settings = featureSettings ?? DEFAULT_FEATURE_SETTINGS;
  const pathname = usePathname();
  const onTabRoot = isMobileTabRoot(pathname);
  const fallbackBack = useBackNavigation("/");
  // Keyed on the path it opened on, and cleared on leaving it so Forward can't reopen it.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  if (drawerPath !== null && drawerPath !== pathname) setDrawerPath(null);
  const isDrawerOpen = drawerPath === pathname;

  // The drawer portals outside this lg:hidden bar, so close it (backdrop and scroll lock) at lg.
  useEffect(() => {
    if (!isDrawerOpen) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => desktop.matches && setDrawerPath(null);
    closeOnDesktop();
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [isDrawerOpen]);

  return (
    <div className="fixed left-0 right-0 top-0 z-[60] border-b border-gray-200/70 bg-surface-card/75 backdrop-blur-[18px] backdrop-saturate-[1.8] lg:hidden">
      <div className="group/bar flex h-16 items-center gap-2 px-4">
        <div className="flex flex-1 basis-0 items-center">
          <div ref={setLeadSlot} className="contents" />
          {onTabRoot ? (
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
              <p className="text-sm font-bold tracking-[0.2em] text-secondary-700">
                RONIN
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={fallbackBack}
              aria-label="Go back"
              className={`-ml-2 group-has-[[data-mobile-back]]/bar:hidden ${ICON_BUTTON}`}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
        </div>

        <div ref={setTitleSlot} className="contents" />

        <div className="-mr-2 flex flex-1 basis-0 items-center justify-end gap-1">
          {/* On back pages the shortcut stays in the ⋮ menu so the title can center. */}
          {onTabRoot && action && (
            <button
              type="button"
              onClick={action.onClick}
              aria-label={action.label}
              title={action.label}
              className={ICON_BUTTON}
            >
              {action.icon}
            </button>
          )}

          {onTabRoot && isFeatureEnabled(settings, "notifications") && (
            <NotificationBell />
          )}

          <div ref={setMenuSlot} className="contents" />

          <button
            type="button"
            onClick={() => setDrawerPath(pathname)}
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={isDrawerOpen}
            className={ICON_BUTTON}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <MobileNavDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerPath(null)}
      />
    </div>
  );
}
