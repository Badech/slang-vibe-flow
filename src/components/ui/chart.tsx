// Minimal stub - using Recharts directly in this project
import * as React from "react";
export const ChartContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => <div ref={ref} {...props}>{children}</div>
);
ChartContainer.displayName = "ChartContainer";
export const ChartTooltip = () => null;
export const ChartTooltipContent = () => null;
export const ChartLegend = () => null;
export const ChartLegendContent = () => null;
export const ChartStyle = () => null;
