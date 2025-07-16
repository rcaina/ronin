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
 *   iconColor="text-green-500"
 * />
 *
 * <StatsCard
 *   title="Days Remaining"
 *   value={15}
 *   subtitle="Ending soon"
 *   icon={<Calendar className="h-4 w-4" />}
 *   iconColor="text-orange-500"
 *   valueColor="text-orange-600"
 *   hover={true}
 *   onClick={() => console.log('Card clicked')}
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
  iconColor = "text-gray-500",
  valueColor = "text-gray-900",
  className = "",
  onClick,
  hover = false,
}: StatsCardProps) => {
  const baseClasses = "rounded-xl border bg-white p-3 shadow-sm sm:p-4 lg:p-6";
  const hoverClasses = hover ? "transition-all hover:shadow-md" : "";
  const clickableClasses = onClick ? "cursor-pointer" : "";

  return (
    <div
      className={`${baseClasses} ${hoverClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
    >
      <div className="mb-2 flex items-center justify-between sm:mb-3 lg:mb-4">
        <h3 className="text-xs font-medium text-gray-500 sm:text-sm">
          {title}
        </h3>
        {icon && (
          <div className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColor}`}>{icon}</div>
        )}
      </div>
      <div className={`text-lg font-bold sm:text-xl lg:text-2xl ${valueColor}`}>
        {value}
      </div>
      {subtitle && (
        <div className="mt-1 text-xs text-gray-500 sm:text-sm">{subtitle}</div>
      )}
    </div>
  );
};

export default StatsCard;
