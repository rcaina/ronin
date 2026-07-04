"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import {
  useEffect,
  useState,
  useCallback,
  useLayoutEffect,
  createContext,
  useContext,
} from "react";
import SideNav from "./SideNav";
import MobileHeader from "./MobileHeader";
import MobileBottomNav from "./MobileBottomNav";
import LoadingSpinner from "./LoadingSpinner";
import { MobileHeaderActionProvider } from "./MobileHeaderActionContext";
import { useTrackNavigationHistory } from "@/lib/utils/navigation-history";

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

// Single source of truth for page-level loading. Pages report their aggregate
// loading state via `usePageLoading`; the layout renders one LoadingSpinner in
// the content area (with the nav still visible) until the page's data is ready.
// Route layouts can read `usePageIsLoading()` to hide their own chrome (e.g. a
// section header / sub-nav) while the page is loading, so every page shows the
// same single-spinner look.
interface PageLoadingContextType {
  pageLoading: boolean;
  setPageLoading: (loading: boolean, message?: string) => void;
}

const PageLoadingContext = createContext<PageLoadingContextType | undefined>(
  undefined,
);

/**
 * Report a page's aggregate loading state to the shell. While `isLoading` is
 * true the layout shows the single loading spinner over the content area and
 * the calling page should `return null`. Pass every data query's loading flag
 * combined (e.g. `a || b || c`) so the loader stays until all data is ready.
 */
export const usePageLoading = (isLoading: boolean, message?: string) => {
  const context = useContext(PageLoadingContext);
  if (context === undefined) {
    throw new Error("usePageLoading must be used within ConditionalLayout");
  }
  const { setPageLoading } = context;
  useLayoutEffect(() => {
    setPageLoading(isLoading, message);
    return () => setPageLoading(false);
  }, [isLoading, message, setPageLoading]);
};

/**
 * Read the current page-loading state. Route layouts use this to hide their own
 * chrome while the active page is loading so only the single shell spinner shows.
 */
export const usePageIsLoading = () => {
  const context = useContext(PageLoadingContext);
  return context?.pageLoading ?? false;
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
  const [pageLoading, setPageLoadingState] = useState(false);
  const [pageLoadingMessage, setPageLoadingMessage] = useState<
    string | undefined
  >(undefined);

  const setPageLoading = useCallback((loading: boolean, message?: string) => {
    setPageLoadingState(loading);
    setPageLoadingMessage(message);
  }, []);

  // Record every route change into the scoped-history stack used by
  // `useBackNavigation`. Mounted here (top-level client component that
  // renders on every authenticated and public page) so it runs regardless
  // of section.
  useTrackNavigationHistory();

  // Auto-collapse main nav when entering budget pages
  useEffect(() => {
    if (pathname.startsWith("/budgets/") && pathname !== "/budgets") {
      setIsCollapsed(true);
    } else if (pathname === "/budgets") {
      // Keep main nav open on the budgets list page
      setIsCollapsed(false);
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

    return (
      <MainNavContext.Provider
        value={{
          isMainNavCollapsed: isCollapsed,
          setIsMainNavCollapsed: setIsCollapsed,
        }}
      >
        <PageLoadingContext.Provider value={{ pageLoading, setPageLoading }}>
          <MobileHeaderActionProvider>
            <main className="flex h-screen bg-surface text-gray-900">
              {/* Mobile Header - only visible on mobile */}
              <MobileHeader />

              {/* Mobile Bottom Tab Bar - primary mobile navigation */}
              <MobileBottomNav />

              {/* Desktop Side Navigation - hidden on mobile */}
              <div className="hidden lg:block">
                <SideNav
                  isCollapsed={isCollapsed}
                  setIsCollapsed={setIsCollapsed}
                />
              </div>

              {/* Main Content Area */}
              <div
                className={`relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden transition-all duration-300 lg:overflow-hidden ${
                  isCollapsed ? "lg:ml-16" : "lg:ml-64"
                } pb-16 pt-32 lg:pb-0 lg:pt-0`}
              >
                {children}
                {/*
                  Single, shell-owned loading state. Pages report their aggregate
                  loading via `usePageLoading` and render null while loading; the
                  page stays mounted (so its data hooks keep running). This overlay
                  sits above any in-page chrome (e.g. a route layout's PageHeader,
                  z-30) but below the fixed app nav, so the nav stays visible while
                  a single spinner covers the content until all data is ready.
                */}
                {pageLoading && (
                  <LoadingSpinner
                    message={pageLoadingMessage}
                    className="absolute inset-0 z-[45]"
                  />
                )}
              </div>
            </main>
          </MobileHeaderActionProvider>
        </PageLoadingContext.Provider>
      </MainNavContext.Provider>
    );
  }

  // If not authenticated and not on a public page, show nothing (will redirect)
  return null;
}
