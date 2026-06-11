"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LogOut,
  Target,
  Receipt,
  PiggyBank,
  LayoutDashboard,
  FolderOpen,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import roninLogo from "@/public/ronin_logo.jpg";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/budgets", icon: Target, label: "Budgets" },
  { href: "/transactions", icon: Receipt, label: "Transactions" },
  { href: "/categories", icon: FolderOpen, label: "Categories" },
  { href: "/savings", icon: PiggyBank, label: "Savings" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function MobileHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut({
      redirect: true,
      callbackUrl: "/sign-in",
    });
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="fixed left-0 right-0 top-0 z-[60] border-b border-gray-200/70 bg-white/90 backdrop-blur-md lg:hidden">
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

          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Open menu"
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 animate-fade-in bg-primary-950/40 backdrop-blur-sm"
            onClick={closeMenu}
          />

          {/* Menu Panel */}
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] animate-fade-in bg-white shadow-lifted">
            <div className="flex h-full flex-col">
              {/* Menu Header */}
              <div className="border-b p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {session?.user?.name ?? "User"}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {session?.user?.email}
                    </p>
                  </div>
                  <button
                    onClick={closeMenu}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Navigation Items - scrollable when list is long */}
              <nav className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {/* Main Navigation Items */}
                  {navItems.map((item) => {
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname === item.href ||
                          pathname.startsWith(item.href + "/");
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenu}
                        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-200 ${
                          isActive
                            ? "bg-secondary/15 text-secondary-700"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${isActive ? "text-secondary-600" : "text-gray-500"}`}
                          strokeWidth={isActive ? 2.2 : 1.8}
                        />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </nav>

              {/* Sign Out Button */}
              <div className="border-t p-4">
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
