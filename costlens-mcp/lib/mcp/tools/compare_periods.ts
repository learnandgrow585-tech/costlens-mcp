import { z } from "zod";
import { SAMPLE_DATA } from "@/lib/focus/sample-data";
import { groupBy, sumCost, round2 } from "@/lib/focus/schema";
import type { McpToolHandler } from "@/lib/mcp/types";

const inputSchema = z.object({
  current_period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM format")
    .default("2026-05")
    .describe("Current period in YYYY-MM format"),
  previous_period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM format")
    .default("2026-04")
    .describe("Previous period in YYYY-MM format"),
  provider: z
    .enum(["aws", "azure", "gcp", "openai", "anthropic", "all"])
    .default("all")
    .describe("Limit comparison to a single provider")
});

const PROVIDER_MAP: Record<string, string> = {
  aws: "Amazon Web Services",
  azure: "Microsoft Azure",
  gcp: "Google Cloud",
  openai: "OpenAI",
  anthropic: "Anthropic"
};

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

export const comparePeriodsTool: McpToolHandler = {
  definition: {
    name: "compare_periods",
    description: `Compares cloud spend between two billing periods (month-over-month).
Use this to answer questions like:
  - "How did our AWS spend change from April to May?"
  - "Month-over-month comparison"
  - "Did our costs go up or down?"
  - "Which services grew the most?"
Returns totals, delta ($ and %), and a service-level diff showing what grew or shrank.`,
    inputSchema: {
      type: "object",
      properties: {
        current_period: {
          type: "string",
          description: "Current period YYYY-MM (default: 2026-05)"
        },
        previous_period: {
          type: "string",
          description: "Previous period YYYY-MM (default: 2026-04)"
        },
        provider: {
          type: "string",
          enum: ["aws", "azure", "gcp", "openai", "anthropic", "all"],
          description: "Provider filter (default: all)"
        }
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

    let records = [...SAMPLE_DATA];
    if (provider !== "all") {
      const provName = PROVIDER_MAP[provider];
      records = records.filter((r) => r.ProviderName === provName);
    }

    const currentRecords  = records.filter((r) => r.BillingPeriodStart.slice(0, 7) === current_period);
    const previousRecords = records.filter((r) => r.BillingPeriodStart.slice(0, 7) === previous_period);

    const currentTotal  = round2(sumCost(currentRecords));
    const previousTotal = round2(sumCost(previousRecords));
    const delta         = round2(currentTotal - previousTotal);
    const deltaPercent  = previousTotal > 0 ? round2((delta / previousTotal) * 100) : 0;
    const trend         = delta > 0 ? "increased" : delta < 0 ? "decreased" : "unchanged";

    // Service-level diff
    const currentByService  = groupBy(currentRecords,  (r) => r.ServiceName);
    const previousByService = groupBy(previousRecords, (r) => r.ServiceName);

    const allServices = Array.from(
      new Set([...Object.keys(currentByService), ...Object.keys(previousByService)])
    );

    const serviceDiff = allServices
      .map((service) => {
        const curr = round2(sumCost(currentByService[service]  ?? []));
        const prev = round2(sumCost(previousByService[service] ?? []));
        const d    = round2(curr - prev);
        const dpct = prev > 0 ? round2((d / prev) * 100) : (curr > 0 ? 100 : 0);
        return {
          service,
          current_cost:  curr,
          previous_cost: prev,
          delta: d,
          delta_percent: dpct,
          status: d > 0 ? "increased" : d < 0 ? "decreased" : "new" as string
        };
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)); // biggest movers first

    const top_increases = serviceDiff.filter((s) => s.delta > 0).slice(0, 3);
    const top_decreases = serviceDiff.filter((s) => s.delta < 0).slice(0, 3);

    const result = {
      summary: `Spend ${trend} by $${Math.abs(delta).toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.abs(deltaPercent)}%) from ${monthLabel(previous_period)} to ${monthLabel(current_period)}`,
      current_period: {
        label:  monthLabel(current_period),
        period: current_period,
        total:  currentTotal,
        formatted: `$${currentTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      },
      previous_period: {
        label:  monthLabel(previous_period),
        period: previous_period,
        total:  previousTotal,
        formatted: `$${previousTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      },
      delta: {
        amount:  delta,
        percent: deltaPercent,
        formatted: `${delta >= 0 ? "+" : ""}$${delta.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        trend
      },
      top_increases: top_increases.map((s) => ({
        service: s.service,
        change: `+$${s.delta.toLocaleString("en-US", { minimumFractionDigits: 2 })} (+${s.delta_percent}%)`
      })),
      top_decreases: top_decreases.map((s) => ({
        service: s.service,
        change: `$${s.delta.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${s.delta_percent}%)`
      })),
      service_breakdown: serviceDiff,
      data_source: "sample",
      note: "Using sample FOCUS data. Connect real accounts (Week 4) for live figures."
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    };
  }
};
