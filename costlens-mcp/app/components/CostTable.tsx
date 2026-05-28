"use client";

import type { CostBreakdownItem } from "@/lib/focus/query-engine";

interface CostTableProps {
  data: CostBreakdownItem[];
}

export function CostTable({ data }: CostTableProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-4 text-xs font-medium uppercase tracking-wider text-fg-subtle">
              Service
            </th>
            <th className="text-right py-2 pr-4 text-xs font-medium uppercase tracking-wider text-fg-subtle">
              Cost (USD)
            </th>
            <th className="text-right py-2 text-xs font-medium uppercase tracking-wider text-fg-subtle">
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.label}
              className="border-b border-border last:border-0 hover:bg-bg-subtle transition-colors"
            >
              <td className="py-2.5 pr-4 text-fg">
                <span className="text-fg-subtle text-xs mr-2">{i + 1}.</span>
                {row.label}
              </td>
              <td className="py-2.5 pr-4 text-right font-mono text-fg">
                ${row.cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </td>
              <td className="py-2.5 text-right text-fg-muted">
                {row.percentage > 0 ? `${row.percentage}%` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
