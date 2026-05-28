"use client";

import { getTotalByProvider, getCurrentMonthTotal, getLastMonthTotal } from "@/lib/focus/query-engine";

const PROVIDER_COLORS: Record<string, string> = {
  "Amazon Web Services": "#FF9900",
  "Microsoft Azure":     "#0078D4",
  "Google Cloud":        "#4285F4",
  "OpenAI":              "#10A37F",
  "Anthropic":           "#CC785C"
};

const PROVIDER_SHORT: Record<string, string> = {
  "Amazon Web Services": "AWS",
  "Microsoft Azure":     "Azure",
  "Google Cloud":        "GCP",
  "OpenAI":              "OpenAI",
  "Anthropic":           "Anthropic"
};

export function ProviderCards() {
  const byProvider  = getTotalByProvider();
  const currentTotal = getCurrentMonthTotal();
  const lastTotal    = getLastMonthTotal();
  const delta        = currentTotal - lastTotal;
  const deltaPercent = lastTotal > 0 ? ((delta / lastTotal) * 100).toFixed(1) : "0";
  const isUp         = delta >= 0;

  return (
    <div className="space-y-3 mb-8">
      {/* Total row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="text-xs text-fg-subtle mb-1">Total this month</div>
          <div className="text-2xl font-semibold gradient-text">
            ${currentTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-fg-subtle mt-1">May 2026 · All providers</div>
        </div>
        <div className="card">
          <div className="text-xs text-fg-subtle mb-1">vs last month</div>
          <div className={`text-2xl font-semibold ${isUp ? "text-red-400" : "text-green-400"}`}>
            {isUp ? "+" : ""}${delta.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className={`text-xs mt-1 ${isUp ? "text-red-400/70" : "text-green-400/70"}`}>
            {isUp ? "▲" : "▼"} {Math.abs(Number(deltaPercent))}% from April 2026
          </div>
        </div>
      </div>

      {/* Per-provider cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {byProvider.map((p) => {
          const color = PROVIDER_COLORS[p.label] ?? "#7c5cff";
          const short = PROVIDER_SHORT[p.label] ?? p.label;
          return (
            <div key={p.label} className="card">
              <div
                className="text-xs font-semibold mb-2 truncate"
                style={{ color }}
              >
                {short}
              </div>
              <div className="text-lg font-semibold text-fg">
                ${p.cost.toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </div>
              <div className="text-xs text-fg-subtle mt-0.5">{p.percentage}% of total</div>

              {/* mini bar */}
              <div className="mt-2 h-1 bg-bg-subtle rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${p.percentage}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
