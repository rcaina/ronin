"use client";

import { AlertTriangle } from "lucide-react";
import IconTooltip from "@/components/IconTooltip";

/**
 * Warning icon shown next to a transaction's date when `occurredAt` is
 * missing, so the displayed date is really just `createdAt` (see
 * `getTransactionDate` in lib/utils/spending.ts).
 */
const MissingDateWarning = () => (
  <IconTooltip
    label="Unknown transaction date"
    content="No purchase date was recorded for this transaction, so we're not sure when it happened. It may appear out of order."
    icon={<AlertTriangle className="h-4 w-4" />}
    className="text-amber-600"
  />
);

export default MissingDateWarning;
