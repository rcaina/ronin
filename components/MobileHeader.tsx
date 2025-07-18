"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/", icon: "📊", label: "Overview" },
  { href: "/budgets", icon: "💰", label: "Budget" },
  { href: "/transactions", icon: "🧾", label: "Transactions" },
  { href: "/categories", icon: "📋", label: "Categories" },
  { href: "/cards", icon: "💳", label: "Cards" },
  { href: "/settings", icon: "⚙️", label: "Settings" },
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
      <div className="fixed left-0 right-0 top-0 z-[60] border-b bg-white shadow-sm lg:hidden">
        <div className="flex items-center justify-between px-3 py-2">
          {/* Logo */}
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-full w-full text-secondary"
              >
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                  fill="currentColor"
                />
                <path
                  d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <h1 className="text-base font-bold text-secondary">RONIN</h1>
          </div>

          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            {isMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={closeMenu} />

          {/* Menu Panel */}
          <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl">
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

              {/* Navigation Items */}
              <nav className="flex-1 p-4">
                <div className="space-y-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                        pathname === item.href
                          ? "bg-secondary/10 text-secondary"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}
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
