"use client";

import { useEffect, useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { FormattedActivityPoint } from "@/lib/dashboard-utils";

const activityChartConfig = {
  fetched: {
    label: "Total Fetched",
    color: "oklch(0.53 0.14 244)",
  },
  autoPosted: {
    label: "Auto Posted",
    color: "oklch(0.696 0.166 163)",
  },
} satisfies ChartConfig;

interface ChartTooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
}

function ActivityChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-popover p-3 shadow-sm shadow-black/5 min-w-[140px]">
      <div className="text-xs font-medium text-muted-foreground mb-1.5">{label}</div>
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          const config = activityChartConfig[entry.dataKey as keyof typeof activityChartConfig];
          return (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className="size-2.5 rounded-full border-2 bg-background"
                style={{ borderColor: entry.color }}
              />
              <span className="text-muted-foreground">{config?.label}:</span>
              <span className="font-semibold text-popover-foreground">{entry.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartLegendDot({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="size-2.5 rounded-full border-2 bg-background"
        style={{ borderColor: color }}
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export default function DashboardChart({ chartData }: { chartData: FormattedActivityPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Defer chart render until the container has positive dimensions
    const el = containerRef.current;
    if (!el) return;
    const check = () => {
      if (el.offsetWidth > 0 && el.offsetHeight > 0) setReady(true);
    };
    check();
    if (!ready) {
      const id = requestAnimationFrame(check);
      return () => cancelAnimationFrame(id);
    }
  }, [ready]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <p className="text-sm text-muted-foreground">No activity data yet.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="px-1 pb-4 pt-2">
      {!ready ? (
        <Skeleton className="h-[200px] w-full rounded-xl" />
      ) : (
        <>
          <ChartContainer
            config={activityChartConfig}
            className="h-[200px] w-full [&_.recharts-curve.recharts-tooltip-cursor]:stroke-transparent"
          >
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="4 8"
                stroke="var(--color-input)"
                strokeOpacity={1}
                horizontal
                vertical={false}
              />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
                tickMargin={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
                tickMargin={8}
                allowDecimals={false}
              />
              <ChartTooltip
                content={<ActivityChartTooltip />}
                cursor={{ strokeDasharray: "3 3", stroke: "var(--color-input)" }}
              />
              <Line
                dataKey="fetched"
                type="monotone"
                stroke="var(--color-fetched)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="autoPosted"
                type="monotone"
                stroke="var(--color-autoPosted)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>

          <div className="flex items-center justify-center gap-5 pt-1">
            <ChartLegendDot label="Total Fetched" color={activityChartConfig.fetched.color} />
            <ChartLegendDot label="Auto Posted" color={activityChartConfig.autoPosted.color} />
          </div>
        </>
      )}
    </div>
  );
}

export function DashboardChartLoading() {
  return <Skeleton className="h-[280px] w-full rounded-xl" />;
}
