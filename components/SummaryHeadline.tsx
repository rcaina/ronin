import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A page's answer in one sentence, leading with the amount that matters. */
export function SummaryHeadline({
  children,
  detail,
  className,
}: {
  children: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <p className="text-2xl tracking-tight text-gray-900 sm:text-[28px] sm:leading-9">
        {children}
      </p>
      {detail && <p className="mt-1 text-sm text-gray-500">{detail}</p>}
    </div>
  );
}

export function HeadlineAmount({
  children,
  tone = "accent",
}: {
  children: ReactNode;
  tone?: "accent" | "negative";
}) {
  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        tone === "negative" ? "text-red-600" : "text-secondary-700",
      )}
    >
      {children}
    </span>
  );
}
