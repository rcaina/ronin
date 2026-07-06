"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { runRecurringCatchUp } from "../services/recurring";
import { recurringTransactionsKey } from "./useRecurring";

/**
 * Fires the idempotent recurring-transactions catch-up (`POST
 * /api/recurring/catch-up`) once per authenticated session. This is the
 * self-hosted/dev substitute for the Vercel cron job (`/api/cron/recurring`)
 * — without it, recurring transactions would only ever post when that cron
 * route is configured and actually running. Mounted once in
 * `ConditionalLayout` so it covers every page a signed-in user lands on.
 *
 * Cheap: no-ops server-side when nothing is due. Idempotent: safe to fire
 * more than once (e.g. a remount) since the guard is `hasRunRef`, and the
 * server-side posting itself is idempotent regardless.
 */
export const useRecurringCatchUp = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!session || hasRunRef.current) return;
    hasRunRef.current = true;

    runRecurringCatchUp()
      .then((result) => {
        if (result.posted > 0) {
          void queryClient.invalidateQueries({
            queryKey: recurringTransactionsKey,
          });
          void queryClient.invalidateQueries({ queryKey: ["transactions"] });
          void queryClient.invalidateQueries({ queryKey: ["allTransactions"] });
          void queryClient.invalidateQueries({ queryKey: ["budget"] });
          void queryClient.invalidateQueries({ queryKey: ["budgets"] });
        }
      })
      .catch((error: unknown) => {
        // Never surface this to the user — it's a background best-effort
        // sync, not something they initiated.
        console.error("Recurring catch-up failed:", error);
      });
  }, [session, queryClient]);
};
