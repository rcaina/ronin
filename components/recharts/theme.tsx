import type { LucideIcon } from "lucide-react";

/**
 * Shared Recharts theme for the app. Import from here instead of hardcoding
 * hex values in pages so every chart stays on the brand palette.
 * See DESIGN.md ("Charts") for usage rules.
 */

// Ordered series palette — warm, muted tones anchored on the brand gold.
export const CHART_COLORS = [
  "#b9a15e", // brand gold
  "#5b7a9d", // dusty blue
  "#6c9a8b", // sage
  "#c97b63", // terracotta
  "#8e7c93", // plum
  "#d9c697", // sand (secondary-300)
  "#5e8d87", // dusty teal
  "#a3894a", // deep gold (secondary-600)
  "#94a3b8", // cool gray
  "#7f9360", // olive
];

// Category group colors — used everywhere Needs/Wants/Investment appear.
export const GROUP_COLORS: Record<string, string> = {
  NEEDS: "#5b7a9d",
  WANTS: "#b9a15e",
  INVESTMENT: "#6c9a8b",
};

// Semantic colors for progress/status visuals.
export const STATUS_COLORS = {
  positive: "#16a34a",
  negative: "#dc2626",
  warning: "#d97706",
  neutral: "#9ca3af",
};

// Default axis styling — quiet, small, no axis lines.
export const chartAxisProps = {
  stroke: "#9ca3af",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

export const chartGridProps = {
  strokeDasharray: "4 4",
  stroke: "#e5e7eb",
  vertical: false,
} as const;

// Pass as `contentStyle` on <Tooltip /> for a soft, rounded tooltip.
export const chartTooltipStyle: React.CSSProperties = {
  backgroundColor: "rgba(14, 14, 16, 0.92)",
  border: "none",
  borderRadius: "12px",
  padding: "8px 12px",
  boxShadow: "0 8px 24px -8px rgb(14 14 16 / 0.35)",
  color: "#ffffff",
  fontSize: "12px",
};

export const chartTooltipLabelStyle: React.CSSProperties = {
  color: "#d1d5db",
  fontWeight: 500,
  marginBottom: 2,
};

export const chartTooltipItemStyle: React.CSSProperties = {
  color: "#ffffff",
};

export const formatChartCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export const formatCompactCurrency = (value: number) =>
  value >= 1000
    ? `$${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`
    : `$${value}`;

interface ChartEmptyStateProps {
  icon: LucideIcon;
  message: string;
  height?: number;
}

/** Consistent placeholder for charts with no data yet. */
export const ChartEmptyState = ({
  icon: Icon,
  message,
  height = 160,
}: ChartEmptyStateProps) => (
  <div
    className="flex items-center justify-center text-gray-300"
    style={{ height }}
  >
    <div className="text-center">
      <Icon className="mx-auto mb-2 h-8 w-8" strokeWidth={1.5} />
      <p className="text-xs font-medium text-gray-400">{message}</p>
    </div>
  </div>
);
