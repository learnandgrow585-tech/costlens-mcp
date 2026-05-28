"use client";

import type { CostBreakdownItem } from "@/lib/focus/query-engine";

interface CostChartProps {
  data: CostBreakdownItem[];
  title?: string;
}

/**
 * Pure CSS bar chart — no dependencies, works in Vercel serverless.
 * Horizontal bars for readability of long service names.
 */
export function CostChart({ data, title }: CostChartProps) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.cost));

  return (
    <div className="card">
      {title && (
        <div className="text-xs font-medium uppercase tracking-wider text-fg-subtle mb-4">
          {title}
        </div>
      )}
      <div className="space-y-3">
        {data.map((item) => {
          const widthPct = max > 0 ? (item.cost / max) * 100 : 0;
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-fg-muted truncate max-w-[60%]" title={item.label}>
                  {item.label}
                </span>
                <span className="text-xs font-mono text-fg ml-2 shrink-0">
                  ${item.cost.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  {item.percentage > 0 && (
                    <span className="text-fg-subtle ml-1">({item.percentage}%)</span>
                  )}
                </span>
              </div>
              <div className="h-2 bg-bg-subtle rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${widthPct}%`,
                    background: "linear-gradient(90deg, #7c5cff, #4cc4ff)"
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
