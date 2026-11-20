// Bottom-tab roots, plus Recurring: a sibling tab of Transactions, not a page under it.
const MOBILE_TAB_ROOTS = [
  "/",
  "/budgets",
  "/transactions",
  "/transactions/recurring",
  "/savings",
];

/** Tab roots wear the logo in `MobileHeader`; every other page gets back + title. */
export const isMobileTabRoot = (pathname: string | null) =>
  pathname !== null && MOBILE_TAB_ROOTS.includes(pathname);

/** Below `lg` every page but Overview drops the `PageHeader` bar; Overview keeps it for its greeting. */
export const isHeaderlessOnMobile = (pathname: string | null) =>
  pathname !== null && pathname !== "/";
