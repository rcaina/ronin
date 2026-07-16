"use client";

import { Info } from "lucide-react";
import IconTooltip from "@/components/IconTooltip";

/**
 * Info-icon tooltip for a transaction's description. See `IconTooltip` for
 * the shared hover/tap/portal/positioning behavior.
 */
const DescriptionTooltip = ({ description }: { description: string }) => (
  <IconTooltip
    label="Show description"
    content={description}
    icon={<Info className="h-4 w-4" />}
  />
);

export default DescriptionTooltip;
