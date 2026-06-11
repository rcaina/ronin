import type { ReactNode } from "react";

/**
 * A reusable stats card component for displaying metrics and statistics.
 *
 * @example
 * ```tsx
 * <StatsCard
 *   title="Total Income"
 *   value="$5,000"
 *   subtitle="Across 3 active budgets"
 *   icon={<DollarSign className="h-4 w-4" />}
 *   iconColor="text-green-600"
 * />
 * ```
 */
interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  iconColor?: string;
  valueColor?: string;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

const StatsCard = ({
  title,
  value,
  subtitle,
  icon,
  iconColor = "text-secondary-600",
  valueColor = "text-gray-900",
  className = "",
  onClick,
  hover = false,
}: StatsCardProps) => {
  const baseClasses = "card-surface p-4 sm:p-5";
  const hoverClasses =
    hover || onClick
      ? "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lifted"
      : "";
  const clickableClasses = onClick ? "cursor-pointer" : "";

  return (
    <div
      className={`${baseClasses} ${hoverClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-surface-muted ${iconColor}`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-xs font-medium text-gray-500">
            {title}
          </h3>
          <div
            className={`truncate text-lg font-bold tabular-nums tracking-tight sm:text-xl ${valueColor}`}
          >
            {value}
          </div>
        </div>
      </div>
      {subtitle && (
        <div className="mt-2 truncate text-xs text-gray-500">{subtitle}</div>
      )}
    </div>
  );
};

export default StatsCard;
