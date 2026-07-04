"use client";

import { useEffect, useRef } from "react";
import { type LucideIcon } from "lucide-react";

export interface SettingsNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SettingsPageNavigationProps {
  tabs: SettingsNavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export default function SettingsPageNavigation({
  tabs,
  activeTab,
  onTabChange,
}: SettingsPageNavigationProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  // Keep the active tab in view when the floating row scrolls horizontally on
  // mobile.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [activeTab]);

  return (
    <>
      {/* Desktop: in-flow pill row under the page header */}
      <div className="hidden bg-surface lg:block">
        <nav className="scrollbar-hide mx-auto w-full overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
          <div className="inline-flex rounded-full bg-surface-muted p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ease-out ${
                    isActive
                      ? "bg-surface-card text-gray-900 shadow-soft"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Mobile: floating pill bar docked just above the bottom tab bar so the
          settings sections are always reachable while scrolling. */}
      <div
        className="fixed inset-x-0 z-50 flex justify-center px-3 lg:hidden"
        style={{ bottom: "calc(56px + env(safe-area-inset-bottom) + 0.5rem)" }}
      >
        <nav className="scrollbar-hide flex max-w-full gap-1 overflow-x-auto rounded-full border border-gray-400/60 bg-surface-muted/95 p-1 shadow-lifted backdrop-blur-md">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={isActive ? activeRef : undefined}
                onClick={() => onTabChange(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all duration-200 ease-out ${
                  isActive
                    ? "bg-secondary/15 text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
