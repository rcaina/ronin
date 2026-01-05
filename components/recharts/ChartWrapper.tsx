// src/components/charts/ChartContainer.tsx
import { ResponsiveContainer } from "recharts";

type Props = {
  children: React.ReactNode;
  height?: number;
};

export function ChartContainer({ children, height = 300 }: Props) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  );
}
