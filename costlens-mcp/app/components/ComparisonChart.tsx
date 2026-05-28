"use client";

interface ComparisonBar {
  label: string;
  current: number;
  previous: number;
}

interface ComparisonChartProps {
  data: ComparisonBar[];
  currentLabel?: string;
  previousLabel?: string;
}

export function ComparisonChart({
  data,
  currentLabel = "May 2026",
  previousLabel = "April 2026"
}: ComparisonChartProps) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.flatMap((d) => [d.current, d.previous]));

  return (
    <div className="card">
      <div className="text-xs font-medium uppercase tracking-wider text-fg-subtle mb-4">
        Month-over-month comparison
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-5 text-xs text-fg-muted">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: "linear-gradient(90deg, #7c5cff, #4cc4ff)" }} />
          {currentLabel}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-bg-subtle border border-border" />
          {previousLabel}
        </div>
      </div>

      <div className="space-y-4">
        {data.map((item) => {
          const currentPct  = max > 0 ? (item.current  / max) * 100 : 0;
          const previousPct = max > 0 ? (item.previous / max) * 100 : 0;
          const delta       = item.current - item.previous;
          const isUp        = delta > 0;

          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-fg-muted truncate max-w-[55%]" title={item.label}>
                  {item.label}
                </span>
                <span className={`text-xs font-mono shrink-0 ml-2 ${isUp ? "text-red-400" : "text-green-400"}`}>
                  {isUp ? "▲" : "▼"} ${Math.abs(delta).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
              </div>

              {/* Current month bar */}
              <div className="h-2 bg-bg-subtle rounded-full overflow-hidden mb-1">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${currentPct}%`,
                    background: "linear-gradient(90deg, #7c5cff, #4cc4ff)"
                  }}
                />
              </div>

              {/* Previous month bar */}
              <div className="h-1.5 bg-bg-subtle rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-fg-subtle/40 transition-all duration-500"
                  style={{ width: `${previousPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
