"use client";

import { useMemo } from "react";

interface ActivityDataPoint {
  date: string;
  count: number;
}

interface ActivityChartProps {
  data: ActivityDataPoint[];
  days?: number;
  height?: number;
}

/**
 * Lightweight GitHub-style activity heatmap / bar chart.
 * No external dependencies — pure CSS + divs.
 */
export function ActivityChart({ data, days = 14, height = 60 }: ActivityChartProps) {
  const maxCount = useMemo(() => Math.max(...data.map((d) => d.count), 1), [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-200 p-6 dark:border-zinc-700">
        <p className="text-xs text-zinc-400">No activity data yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Bar chart */}
      <div
        className="flex items-end gap-1"
        style={{ height }}
      >
        {data.slice(-days).map((point, i) => {
          const barHeight = maxCount > 0 ? (point.count / maxCount) * height : 0;
          const intensity = maxCount > 0 ? point.count / maxCount : 0;

          // Color gradient from blue-100 to blue-600
          const bgClass =
            intensity > 0.8
              ? "bg-blue-600"
              : intensity > 0.6
                ? "bg-blue-500"
                : intensity > 0.4
                  ? "bg-blue-400"
                  : intensity > 0.2
                    ? "bg-blue-300"
                    : intensity > 0
                      ? "bg-200"
                      : "bg-zinc-100 dark:bg-zinc-800";

          return (
            <div
              key={i}
              className="group flex flex-1 flex-col items-center gap-1"
            >
              {/* Tooltip */}
              <div className="pointer-events-none absolute mb-1 hidden rounded-md bg-zinc-900 px-2 py-1 text-[10px] text-white group-hover:block dark:bg-zinc-700">
                {point.count} submission{point.count !== 1 ? "s" : ""}
              </div>
              <div
                className={`w-full min-w-[4px] rounded-t-sm transition-all duration-300 ${bgClass}`}
                style={{
                  height: `${Math.max(barHeight, point.count > 0 ? 3 : 0)}px`,
                }}
                title={`${point.date}: ${point.count} submission${point.count !== 1 ? "s" : ""}`}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-[10px] text-zinc-400">
        {data.length > 1 && (
          <>
            <span>{formatDateLabel(data[0].date)}</span>
            <span>{formatDateLabel(data[data.length - 1].date)}</span>
          </>
        )}
      </div>
    </div>
  );
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
