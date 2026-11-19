import type { LucideIcon } from "lucide-react";

/**
 * Shared Recharts theme for the app. Import from here instead of hardcoding
 * hex values in pages so every chart stays on the brand palette.
 * See DESIGN.md ("Charts") for usage rules.
 */

// Ordered series palette — warm, muted tones anchored on the brand brass.
// Fixed hexes (not theme vars), so each must read on both light and dark cards.
export const CHART_COLORS = [
  "#b48a35", // brand brass (accent-500)
  "#5b7a9d", // dusty blue
  "#6c9a8b", // sage
  "#c97b63", // terracotta
  "#8e7c93", // plum
  "#d4b064", // gilt (accent-400)
  "#5e8d87", // dusty teal
  "#a5788b", // dusty rose
  "#a8a29e", // warm gray
  "#7f9360", // olive
];

// Category group colors — used everywhere Needs/Wants/Investment appear.
export const GROUP_COLORS: Record<string, string> = {
  NEEDS: "#5b7a9d",
  WANTS: "#b48a35",
  INVESTMENT: "#6c9a8b",
};

// Semantic colors for progress/status visuals.
export const STATUS_COLORS = {
  positive: "#16a34a",
  negative: "#dc2626",
  warning: "#d97706",
  neutral: "#a8a29e",
};

// Default axis styling — quiet, small, no axis lines. Stroke is theme-aware via
// the --chart-axis CSS variable (see src/styles/globals.css) so axes stay legible
// in dark mode.
export const chartAxisProps = {
  stroke: "var(--chart-axis)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

export const chartGridProps = {
  strokeDasharray: "4 4",
  stroke: "var(--chart-grid)",
  vertical: false,
} as const;

// Bar hover wash and empty-track fill. Theme vars so both flip with `.dark`.
export const chartCursorFill = "rgb(var(--secondary-500) / 0.08)";
export const chartTrackFill = "rgb(var(--surface-muted))";

// Pass as `contentStyle` on <Tooltip /> for a soft, rounded tooltip.
export const chartTooltipStyle: React.CSSProperties = {
  backgroundColor: "rgba(23, 21, 15, 0.92)",
  border: "none",
  borderRadius: "12px",
  padding: "8px 12px",
  boxShadow: "0 8px 24px -8px rgb(23 21 15 / 0.35)",
  color: "#ffffff",
  fontSize: "12px",
};

export const chartTooltipLabelStyle: React.CSSProperties = {
  color: "#d6d3d1",
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
