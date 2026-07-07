/**
 * Thrown when a gated mutation is blocked by a free-tier entitlement limit —
 * i.e. the API responded 402 with `{ error, upgradeRequired: true }` (see
 * `lib/api-services/entitlements.ts#paymentRequired`). Components catch this
 * specifically to open `UpgradeModal` instead of showing a generic error
 * toast.
 */
export class UpgradeRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpgradeRequiredError";
    Object.setPrototypeOf(this, UpgradeRequiredError.prototype);
  }
}

/**
 * Reads a failed fetch `Response` body and throws the appropriate error —
 * `UpgradeRequiredError` for a 402 paywall response, otherwise a plain
 * `Error` built from the server's `{ error }` message (falling back to
 * `response.statusText`). Always throws; the `never` return type lets
 * callers write `if (!response.ok) return parseErrorResponse(response);`
 * without an extra `throw`.
 */
export const parseErrorResponse = async (
  response: Response,
): Promise<never> => {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
    upgradeRequired?: boolean;
  } | null;

  if (response.status === 402 && body?.upgradeRequired) {
    throw new UpgradeRequiredError(body.error ?? "Upgrade required");
  }

  throw new Error(body?.error ?? response.statusText);
};
