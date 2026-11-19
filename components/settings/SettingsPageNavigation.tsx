"use client";

import { type LucideIcon } from "lucide-react";
import Tabs from "@/components/Tabs";

export interface SettingsNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SettingsPageNavigationProps {
  tabs: SettingsNavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  panelId: string;
}

export default function SettingsPageNavigation({
  tabs,
  activeTab,
  onTabChange,
  panelId,
}: SettingsPageNavigationProps) {
  return (
    <>
      {/* Underline tab row under the page header; sticks under it on mobile */}
      <div className="sticky top-0 z-20 border-b border-gray-200/70 bg-surface/90 backdrop-blur-md lg:static lg:z-auto lg:border-b-0 lg:bg-surface lg:backdrop-blur-none">
        <nav className="mx-auto w-full px-4 py-2 sm:px-6 lg:px-8">
          <Tabs
            ariaLabel="Settings sections"
            items={tabs}
            value={activeTab}
            onChange={onTabChange}
            panelId={panelId}
            scroll
          />
        </nav>
      </div>
    </>
  );
}
