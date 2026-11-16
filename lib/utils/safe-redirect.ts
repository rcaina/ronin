/** The same-origin path a sign-in `callbackUrl` points at, or "/" for anything else. */
export const safeCallbackPath = (
  callbackUrl: string | null,
  origin: string,
): string => {
  if (!callbackUrl) return "/";
  try {
    const url = new URL(callbackUrl, origin);
    return url.origin === origin
      ? `${url.pathname}${url.search}${url.hash}`
      : "/";
  } catch {
    return "/";
  }
};
