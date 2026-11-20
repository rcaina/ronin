// Tab sections whose pages are all named by the tab bar or their section tab row.
// Overview is left out so its greeting stays visible.
const MOBILE_HEADERLESS_SECTIONS = ["/budgets", "/transactions", "/savings"];

/** Below `lg` these pages drop the `PageHeader` bar: the tab bar or section tabs already name the page. */
export const isHeaderlessOnMobile = (pathname: string | null) =>
  pathname !== null &&
  MOBILE_HEADERLESS_SECTIONS.some(
    (section) => pathname === section || pathname.startsWith(`${section}/`),
  );
