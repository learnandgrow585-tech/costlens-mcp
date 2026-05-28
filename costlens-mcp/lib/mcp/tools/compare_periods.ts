import { z } from "zod";
import { getRecords } from "@/lib/focus/store";
import { groupBy, sumCost, round2 } from "@/lib/focus/schema";
import type { McpToolHandler } from "@/lib/mcp/types";

const inputSchema = z.object({
  current_period:  z.string().regex(/^\d{4}-\d{2}$/).default(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }),
  previous_period: z.string().regex(/^\d{4}-\d{2}$/).default(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }),
  provider: z.enum(["aws", "azure", "gcp", "openai", "anthropic", "all"]).default("all")
});

const PROVIDER_MAP: Record<string, string> = {
  aws: "Amazon Web Services", azure: "Microsoft Azure",
  gcp: "Google Cloud", openai: "OpenAI", anthropic: "Anthropic"
};

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleString("en-US", { month: "long", year: "numeric" });
}

export const comparePeriodsTool: McpToolHandler = {
  definition: {
    name: "compare_periods",
    description: `Compares cloud spend between two billing periods (month-over-month).
Automatically uses live AWS data when credentials are configured.
Use this for:
  - "How did our AWS spend change from last month?"
  - "Month-over-month cost comparison"
  - "Which services grew the most this month?"
Returns totals, $ and % delta, and a service-level breakdown of biggest movers.`,
    inputSchema: {
      type: "object",
      properties: {
        current_period:  { type: "string", description: "Current period YYYY-MM (defaults to current month)" },
        previous_period: { type: "string", description: "Previous period YYYY-MM (defaults to last month)" },
        provider: { type: "string", enum: ["aws", "azure", "gcp", "openai", "anthropic", "all"] }
      },
      required: []
    }
  },

  async call(args) {
    const parsed = inputSchema.safeParse(args);
    if (!parsed.success) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: parsed.error.message }) }],
        isError: true
      };
    }

    const { current_period, previous_period, provider } = parsed.data;
    const { records, source } = await getRecords();

    let filtered = [...records];
    if (provider !== "all") {
      filtered = filtered.filter((r) => r.ProviderName === PROVIDER_MAP[provider]);
    }

    const current  = filtered.filter((r) => r.BillingPeriodStart.slice(0, 7) === current_period);
    const previous = filtered.filter((r) => r.BillingPeriodStart.slice(0, 7) === previous_period);

    const currentTotal  = round2(sumCost(current));
    const previousTotal = round2(sumCost(previous));
    const delta         = round2(currentTotal - previousTotal);
    const deltaPercent  = previousTotal > 0 ? round2((delta / previousTotal) * 100) : 0;
    const trend         = delta > 0 ? "increased" : delta < 0 ? "decreased" : "unchanged";

    // Service diff
    const currentBySvc  = groupBy(current,  (r) => r.ServiceName);
    const previousBySvc = groupBy(previous, (r) => r.ServiceName);
    const allServices   = Array.from(new Set([...Object.keys(currentBySvc), ...Object.keys(previousBySvc)]));

    const serviceDiff = allServices.map((service) => {
      const curr = round2(sumCost(currentBySvc[service]  ?? []));
      const prev = round2(sumCost(previousBySvc[service] ?? []));
      const d    = round2(curr - prev);
      const dpct = prev > 0 ? round2((d / prev) * 100) : (curr > 0 ? 100 : 0);
      return { service, current_cost: curr, previous_cost: prev, delta: d, delta_percent: dpct,
               status: d > 0 ? "increased" : d < 0 ? "decreased" : "unchanged" };
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          summary: `Spend ${trend} by $${Math.abs(delta).toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.abs(deltaPercent)}%) from ${monthLabel(previous_period)} to ${monthLabel(current_period)}`,
          current_period:  { label: monthLabel(current_period),  period: current_period,  total: currentTotal,  formatted: `$${currentTotal.toLocaleString("en-US",  { minimumFractionDigits: 2 })}` },
          previous_period: { label: monthLabel(previous_period), period: previous_period, total: previousTotal, formatted: `$${previousTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
          delta:           { amount: delta, percent: deltaPercent, formatted: `${delta >= 0 ? "+" : ""}$${delta.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, trend },
          top_increases:   serviceDiff.filter((s) => s.delta > 0).slice(0, 3).map((s) => ({
            service: s.service, change: `+$${s.delta.toLocaleString("en-US", { minimumFractionDigits: 2 })} (+${s.delta_percent}%)`
          })),
          top_decreases:   serviceDiff.filter((s) => s.delta < 0).slice(0, 3).map((s) => ({
            service: s.service, change: `$${s.delta.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${s.delta_percent}%)`
          })),
          service_breakdown: serviceDiff,
          data_source: source
        }, null, 2)
      }]
    };
  }
};
