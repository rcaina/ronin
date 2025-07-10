"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import SideNav from "./SideNav";
import MobileHeader from "./MobileHeader";
import LoadingSpinner from "./LoadingSpinner";

// Pages that don't require authentication
const PUBLIC_PAGES = ["/sign-in", "/sign-up"];

// Pages that don't show the side navigation
const NO_NAV_PAGES = ["/welcome"];

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated" && !PUBLIC_PAGES.includes(pathname)) {
      router.push("/sign-in");
    }
  }, [status, router, pathname]);

  // Show loading state while checking authentication
  if (status === "loading") {
    return <LoadingSpinner message="Loading..." />;
  }

  // For public pages, render without AuthLayout
  if (PUBLIC_PAGES.includes(pathname)) {
    return <main className="max-h-screen">{children}</main>;
  }

  // For authenticated pages, render with AuthLayout
  if (session) {
    // Check if current page should hide navigation
    const shouldHideNav = NO_NAV_PAGES.some((page) =>
      pathname.startsWith(page),
    );

    if (shouldHideNav) {
      return <main className="max-h-screen">{children}</main>;
    }

    return (
      <main className="bg-gray/90 flex text-black">
        {/* Mobile Header - only visible on mobile */}
        <MobileHeader />

        {/* Desktop Side Navigation - hidden on mobile */}
        <div className="hidden lg:block">
          <SideNav isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        </div>

        {/* Main Content Area */}
        <div
          className={`flex-1 transition-all duration-300 ${
            isCollapsed ? "lg:ml-16" : "lg:ml-64"
          } pt-32 lg:pt-0`}
        >
          {children}
        </div>
      </main>
    );
  }

  // If not authenticated and not on a public page, show nothing (will redirect)
  return null;
}
