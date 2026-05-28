/**
 * ai_spend tool — AI-specific cost breakdown across all providers.
 *
 * Filters FOCUS records to ServiceCategory "AI and Machine Learning" and
 * returns a rich breakdown by vendor, service, and trend.
 *
 * Use this for questions like:
 *   "How much are we spending on AI APIs?"
 *   "Compare our AI costs to cloud infrastructure"
 *   "Is our AI spend growing?"
 *   "Which AI provider costs the most?"
 */

import { z } from "zod";
import { getRecords } from "@/lib/focus/store";
import { groupBy, sumCost, round2 } from "@/lib/focus/schema";
import type { McpToolHandler } from "@/lib/mcp/types";

// ── AI provider display names ────────────────────────────────────────────

const AI_PROVIDER_LABELS: Record<string, string> = {
  "OpenAI":                  "OpenAI",
  "Anthropic":               "Anthropic",
  "Amazon Web Services":     "AWS (Bedrock + AI services)",
  "Microsoft Azure":         "Azure (OpenAI + AI services)",
  "Google Cloud":            "GCP (Vertex AI + AI services)"
};

// ── Input schema ─────────────────────────────────────────────────────────

const inputSchema = z.object({
  period: z.enum(["current_month", "last_month", "both"]).default("current_month"),
  group_by: z.enum(["provider", "service", "both"]).default("provider")
});

// ── Period helpers ───────────────────────────────────────────────────────

function periodKey(offset: number): string {
  const now = new Date();
  const d   = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const PERIOD_LABELS: Record<string, string> = {
  current_month: "This month",
  last_month:    "Last month",
  both:          "Last 2 months"
};

// ── Tool definition ───────────────────────────────────────────────────────

export const aiSpendTool: McpToolHandler = {
  definition: {
    name: "ai_spend",
    description: `Returns a breakdown of AI + ML spend across all providers.
Covers: OpenAI API, Anthropic API, AWS Bedrock, Azure OpenAI, GCP Vertex AI.
Useful for:
  - "How much are we spending on AI APIs this month?"
  - "Compare our AI spend to total cloud costs"
  - "Is our AI spend growing month over month?"
  - "Which AI provider / service costs the most?"`,
    inputSchema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["current_month", "last_month", "both"],
          description: "Time window (default: current_month)"
        },
        group_by: {
          type: "string",
          enum: ["provider", "service", "both"],
          description: "How to break down the results (default: provider)"
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

    const { period, group_by } = parsed.data;
    const { records, source, providers } = await getRecords();

    // Filter to AI & ML category only
    const aiRecords = records.filter((r) => r.ServiceCategory === "AI and Machine Learning");

    // Apply period filter
    const keys: string[] = [];
    if (period === "current_month" || period === "both") keys.push(periodKey(0));
    if (period === "last_month"    || period === "both") keys.push(periodKey(-1));

    const filtered = aiRecords.filter((r) =>
      keys.some((k) => r.BillingPeriodStart.slice(0, 7) === k)
    );

    // Total spend (all categories) for % calculation
    const totalAllCategories = round2(
      sumCost(records.filter((r) =>
        keys.some((k) => r.BillingPeriodStart.slice(0, 7) === k)
      ))
    );
    const totalAi = round2(sumCost(filtered));

    if (filtered.length === 0) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            period:   PERIOD_LABELS[period],
            total_ai_spend: "$0.00",
            message:  "No AI/ML spend records found for the selected period.",
            data_source: source
          })
        }]
      };
    }

    // ── By provider ──────────────────────────────────────────────────────
    const byProvider = Object.entries(groupBy(filtered, (r) => r.ProviderName))
      .map(([provider, recs]) => {
        const cost = round2(sumCost(recs));
        return {
          provider,
          provider_label:       AI_PROVIDER_LABELS[provider] ?? provider,
          cost,
          cost_formatted:       `$${cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          pct_of_ai_spend:      round2((cost / totalAi) * 100),
          pct_of_total_spend:   round2((cost / totalAllCategories) * 100)
        };
      })
      .sort((a, b) => b.cost - a.cost);

    // ── By service ───────────────────────────────────────────────────────
    const byService = Object.entries(groupBy(filtered, (r) => `${r.ProviderName}::${r.ServiceName}`))
      .map(([key, recs]) => {
        const [provider, service] = key.split("::");
        const cost = round2(sumCost(recs));
        return {
          provider,
          service,
          cost,
          cost_formatted: `$${cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          pct_of_ai_spend: round2((cost / totalAi) * 100)
        };
      })
      .sort((a, b) => b.cost - a.cost);

    // ── Month-over-month trend (only when period = "both") ───────────────
    let trend: object | undefined;
    if (period === "both") {
      const curKey  = periodKey(0);
      const prevKey = periodKey(-1);
      const curCost  = round2(sumCost(filtered.filter((r) => r.BillingPeriodStart.slice(0, 7) === curKey)));
      const prevCost = round2(sumCost(filtered.filter((r) => r.BillingPeriodStart.slice(0, 7) === prevKey)));
      const change   = round2(curCost - prevCost);
      const changePct = prevCost > 0 ? round2((change / prevCost) * 100) : null;
      trend = {
        current_month_key:  curKey,
        previous_month_key: prevKey,
        current_month_ai:   `$${curCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        previous_month_ai:  `$${prevCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        change:             `${change >= 0 ? "+" : ""}$${Math.abs(change).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        change_pct:         changePct !== null ? `${changePct >= 0 ? "+" : ""}${changePct}%` : "N/A",
        direction:          change > 0 ? "increase" : change < 0 ? "decrease" : "flat"
      };
    }

    // ── Build response ────────────────────────────────────────────────────
    const result: Record<string, unknown> = {
      period:              PERIOD_LABELS[period],
      total_ai_spend:      `$${totalAi.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      total_ai_spend_raw:  totalAi,
      total_all_spend:     `$${totalAllCategories.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      ai_pct_of_total:     `${round2((totalAi / totalAllCategories) * 100)}%`,
      data_source:         source,
      connected_providers: providers
    };

    if (group_by === "provider" || group_by === "both") {
      result.by_provider = byProvider;
    }
    if (group_by === "service" || group_by === "both") {
      result.by_service = byService.slice(0, 15);
    }
    if (trend) {
      result.month_over_month = trend;
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    };
  }
};
