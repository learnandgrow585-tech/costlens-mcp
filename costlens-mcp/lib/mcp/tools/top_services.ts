import { z } from "zod";
import { SAMPLE_DATA } from "@/lib/focus/sample-data";
import { groupBy, sumCost, round2 } from "@/lib/focus/schema";
import type { McpToolHandler } from "@/lib/mcp/types";

const inputSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(10)
    .describe("Number of top services to return (1–20, default 10)"),
  period: z
    .enum(["current_month", "last_month", "all"])
    .default("current_month")
    .describe("Billing period"),
  provider: z
    .enum(["aws", "azure", "gcp", "openai", "anthropic", "all"])
    .default("all")
    .describe("Filter to a specific provider")
});

function periodKey(period: string): string | null {
  const now = new Date();
  if (period === "current_month") {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  if (period === "last_month") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return null; // all
}

const PROVIDER_MAP: Record<string, string> = {
  aws: "Amazon Web Services",
  azure: "Microsoft Azure",
  gcp: "Google Cloud",
  openai: "OpenAI",
  anthropic: "Anthropic"
};

export const topServicesTool: McpToolHandler = {
  definition: {
    name: "top_services",
    description: `Returns the top N most expensive services ranked by billed cost.
Use this to answer questions like:
  - "What are our top 10 most expensive services this month?"
  - "Show me the biggest AWS cost drivers"
  - "What's our most expensive GCP service?"
Returns service name, provider, cost, and percentage of total.`,
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of results (default 10, max 20)"
        },
        period: {
          type: "string",
          enum: ["current_month", "last_month", "all"],
          description: "Billing period (default: current_month)"
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

    const { limit, period, provider } = parsed.data;

    // Filter
    let records = [...SAMPLE_DATA];

    if (provider !== "all") {
      const provName = PROVIDER_MAP[provider];
      records = records.filter((r) => r.ProviderName === provName);
    }

    const key = periodKey(period);
    if (key) {
      records = records.filter((r) => r.BillingPeriodStart.slice(0, 7) === key);
    }

    if (records.length === 0) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ error: "No records found for the given filters.", top_services: [] })
        }]
      };
    }

    const total = round2(sumCost(records));
    const byService = groupBy(records, (r) => r.ServiceName);

    const ranked = Object.entries(byService)
      .map(([service, recs]) => {
        const cost = round2(sumCost(recs));
        return {
          rank: 0,
          service,
          provider: recs[0].ProviderName,
          category: recs[0].ServiceCategory,
          cost,
          cost_formatted: `$${cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          percentage_of_total: round2((cost / total) * 100)
        };
      })
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit)
      .map((item, i) => ({ ...item, rank: i + 1 }));

    const periodLabels: Record<string, string> = {
      current_month: "May 2026",
      last_month: "April 2026",
      all: "all time"
    };

    const result = {
      period: periodLabels[period],
      provider_filter: provider === "all" ? "All providers" : PROVIDER_MAP[provider],
      total_spend: `$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      total_raw: total,
      top_services: ranked,
      record_count: records.length,
      data_source: "sample",
      note: "Using sample FOCUS data. Connect real cloud accounts (Week 4) for live figures."
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    };
  }
};
