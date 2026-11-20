"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  CreditCard,
  FolderOpen,
  LogOut,
  Settings,
  type LucideIcon,
} from "lucide-react";
import Modal from "./Modal";
import { useFeatureSettings } from "@/lib/data-hooks/accounts/useFeatureSettings";
import { isFeatureEnabled } from "@/lib/utils/features";
import { DEFAULT_FEATURE_SETTINGS } from "@/lib/types/feature-settings";

interface DrawerLink {
  href: string;
  icon: LucideIcon;
  label: string;
  feature?: "cards";
}

// Destinations that aren't bottom tabs.
const links: DrawerLink[] = [
  { href: "/categories", icon: FolderOpen, label: "Categories" },
  { href: "/cards", icon: CreditCard, label: "Cards", feature: "cards" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function MobileNavDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { data: featureSettings } = useFeatureSettings();
  const settings = featureSettings ?? DEFAULT_FEATURE_SETTINGS;
  const visibleLinks = links.filter(
    (link) => !link.feature || isFeatureEnabled(settings, link.feature),
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Menu" variant="drawer">
      <nav aria-label="More pages" className="-mx-3 flex flex-col">
        {visibleLinks.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 transition-colors duration-150 ease-brand ${
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${isActive ? "text-gray-900" : "text-gray-500"}`}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span className="font-medium">{link.label}</span>
            </Link>
          );
        })}
        <div className="my-2 border-t border-gray-200/70" />
        <button
          type="button"
          onClick={() =>
            void signOut({ redirect: true, callbackUrl: "/sign-in" })
          }
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-red-600 transition-colors duration-150 ease-brand hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" strokeWidth={1.8} />
          <span className="font-medium">Sign out</span>
        </button>
      </nav>
    </Modal>
  );
}
