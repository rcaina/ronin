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
}

export default function SettingsPageNavigation({
  tabs,
  activeTab,
  onTabChange,
}: SettingsPageNavigationProps) {
  return (
    <>
      {/* In-flow underline tab row under the page header, at every width */}
      <div className="bg-surface">
        <nav className="mx-auto w-full px-4 py-2 sm:px-6 lg:px-8">
          <Tabs
            ariaLabel="Settings sections"
            items={tabs}
            value={activeTab}
            onChange={onTabChange}
            scroll
          />
        </nav>
      </div>
    </>
  );
}
