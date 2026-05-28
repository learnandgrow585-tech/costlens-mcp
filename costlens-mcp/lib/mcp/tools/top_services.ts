import { z } from "zod";
import { getRecords } from "@/lib/focus/store";
import { groupBy, sumCost, round2 } from "@/lib/focus/schema";
import type { McpToolHandler } from "@/lib/mcp/types";

const inputSchema = z.object({
  limit: z.number().int().min(1).max(20).default(10),
  period: z.enum(["current_month", "last_month", "all"]).default("current_month"),
  provider: z.enum(["aws", "azure", "gcp", "openai", "anthropic", "all"]).default("all")
});

function periodKey(period: string): string | null {
  const now = new Date();
  if (period === "current_month") {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  if (period === "last_month") {
    const d = new Date(now); d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return null;
}

const PROVIDER_MAP: Record<string, string> = {
  aws: "Amazon Web Services", azure: "Microsoft Azure",
  gcp: "Google Cloud", openai: "OpenAI", anthropic: "Anthropic"
};

const PERIOD_LABELS: Record<string, string> = {
  current_month: "This month", last_month: "Last month", all: "All time"
};

export const topServicesTool: McpToolHandler = {
  definition: {
    name: "top_services",
    description: `Returns the top N most expensive services ranked by billed cost.
Automatically uses live AWS data when credentials are configured.
Use this for:
  - "What are our top 10 most expensive services this month?"
  - "Show me the biggest AWS cost drivers"
  - "What is our most expensive GCP service?"`,
    inputSchema: {
      type: "object",
      properties: {
        limit:    { type: "number", description: "Number of results (default 10, max 20)" },
        period:   { type: "string", enum: ["current_month", "last_month", "all"] },
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

    const { limit, period, provider } = parsed.data;
    const { records, source } = await getRecords();

    let filtered = [...records];
    if (provider !== "all") {
      const name = PROVIDER_MAP[provider];
      filtered = filtered.filter((r) => r.ProviderName === name);
    }
    const key = periodKey(period);
    if (key) filtered = filtered.filter((r) => r.BillingPeriodStart.slice(0, 7) === key);

    if (filtered.length === 0) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "No records found.", top_services: [] }) }] };
    }

    const total = round2(sumCost(filtered));
    const ranked = Object.entries(groupBy(filtered, (r) => r.ServiceName))
      .map(([service, recs]) => {
        const cost = round2(sumCost(recs));
        return {
          rank: 0, service, provider: recs[0].ProviderName,
          category: recs[0].ServiceCategory, cost,
          cost_formatted: `$${cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          percentage_of_total: round2((cost / total) * 100)
        };
      })
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit)
      .map((item, i) => ({ ...item, rank: i + 1 }));

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          period: PERIOD_LABELS[period],
          provider_filter: provider === "all" ? "All providers" : PROVIDER_MAP[provider],
          total_spend: `$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          total_raw: total,
          top_services: ranked,
          record_count: filtered.length,
          data_source: source
        }, null, 2)
      }]
    };
  }
};
