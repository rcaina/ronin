import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A band of figures split by hairlines, edge to edge on phones. Children are `Metric`s. */
export function MetricStrip({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDListElement>) {
  return (
    <dl
      className={cn(
        // gap-px over a gray ground draws the hairlines; from lg every metric shares one row.
        "-mx-4 grid grid-cols-2 gap-px overflow-hidden border-y border-gray-200 bg-gray-200 sm:mx-0 sm:rounded-2xl sm:border lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none [&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1",
        className,
      )}
      {...props}
    >
      {children}
    </dl>
  );
}

interface MetricProps {
  label: string;
  value: ReactNode;
  hint?: string;
  valueClassName?: string;
}

export function Metric({ label, value, hint, valueClassName }: MetricProps) {
  return (
    <div className="min-w-0 bg-surface px-4 py-3 sm:py-4">
      <dt className="truncate text-xs font-medium text-gray-500">{label}</dt>
      <dd
        className={cn(
          "mt-1 truncate text-xl font-semibold tabular-nums tracking-tight text-gray-900 sm:text-2xl",
          valueClassName,
        )}
      >
        {value}
      </dd>
      {hint && (
        <dd className="mt-0.5 truncate text-xs text-gray-500">{hint}</dd>
      )}
    </div>
  );
}
