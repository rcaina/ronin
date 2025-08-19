"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, createContext, useContext } from "react";
import SideNav from "./SideNav";
import MobileHeader from "./MobileHeader";
import LoadingSpinner from "./LoadingSpinner";

// Create context for main navigation state
interface MainNavContextType {
  isMainNavCollapsed: boolean;
  setIsMainNavCollapsed: (collapsed: boolean) => void;
}

const MainNavContext = createContext<MainNavContextType | undefined>(undefined);

export const useMainNav = () => {
  const context = useContext(MainNavContext);
  if (context === undefined) {
    throw new Error("useMainNav must be used within a MainNavProvider");
  }
  return context;
};

// Create context for budget navigation state
interface BudgetNavContextType {
  isBudgetNavCollapsed: boolean;
  setIsBudgetNavCollapsed: (collapsed: boolean) => void;
}

const BudgetNavContext = createContext<BudgetNavContextType | undefined>(
  undefined,
);

export const useBudgetNav = () => {
  const context = useContext(BudgetNavContext);
  if (context === undefined) {
    throw new Error("useBudgetNav must be used within a BudgetNavProvider");
  }
  return context;
};

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
  const [isBudgetNavCollapsed, setIsBudgetNavCollapsed] = useState(false);

  // Auto-collapse main nav when entering budget pages
  useEffect(() => {
    if (pathname.startsWith("/budgets/") && pathname !== "/budgets") {
      setIsCollapsed(true);
    } else if (pathname === "/budgets") {
      // Keep main nav open on the budgets list page
      setIsCollapsed(false);
    }
  }, [pathname]);

  // Reset budget nav state when leaving budget pages
  useEffect(() => {
    if (!pathname.startsWith("/budgets/") || pathname === "/budgets") {
      setIsBudgetNavCollapsed(false);
    }
  }, [pathname]);

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

    // Check if we're on a budget page
    const isBudgetPage =
      pathname.startsWith("/budgets/") && pathname !== "/budgets";

    return (
      <MainNavContext.Provider
        value={{
          isMainNavCollapsed: isCollapsed,
          setIsMainNavCollapsed: setIsCollapsed,
        }}
      >
        <BudgetNavContext.Provider
          value={{
            isBudgetNavCollapsed: isBudgetNavCollapsed,
            setIsBudgetNavCollapsed: setIsBudgetNavCollapsed,
          }}
        >
          <main className="bg-gray/90 flex text-black">
            {/* Mobile Header - only visible on mobile */}
            <MobileHeader />

            {/* Desktop Side Navigation - hidden on mobile */}
            <div className="hidden lg:block">
              <SideNav
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
              />
            </div>

            {/* Main Content Area */}
            <div
              className={`flex-1 transition-all duration-300 ${
                isBudgetPage
                  ? isCollapsed
                    ? isBudgetNavCollapsed
                      ? "lg:ml-20"
                      : "lg:ml-20"
                    : isBudgetNavCollapsed
                      ? "lg:ml-72"
                      : "lg:ml-72"
                  : isCollapsed
                    ? "lg:ml-20"
                    : "lg:ml-64"
              } pt-32 lg:pt-0`}
            >
              {children}
            </div>
          </main>
        </BudgetNavContext.Provider>
      </MainNavContext.Provider>
    );
  }

  // If not authenticated and not on a public page, show nothing (will redirect)
  return null;
}
