/** The same-origin path a sign-in `callbackUrl` points at, or "/" for anything else. */
export const safeCallbackPath = (
  callbackUrl: string | null,
  origin: string,
): string => {
  if (!callbackUrl) return "/";
  try {
    const url = new URL(callbackUrl, origin);
    // "/.//evil.com" normalizes to the pathname "//evil.com", which the router reads as another host.
    if (url.origin !== origin || url.pathname.startsWith("//")) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
};
