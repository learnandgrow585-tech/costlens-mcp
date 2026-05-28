/**
 * detect_anomalies tool — flags services with unexpected cost spikes.
 *
 * Compares current month vs previous month per service and surfaces:
 *   • "spike"   — cost increased above the threshold
 *   • "new"     — service appeared this month with no prior spend
 *   • "dropped" — service had spend last month but nothing this month
 *
 * Severity bands (applied regardless of user threshold):
 *   critical  ≥ 100 % increase
 *   high      ≥  50 % increase
 *   medium    ≥  30 % increase
 *   low       ≥  threshold % increase (when threshold < 30)
 *
 * Use this for questions like:
 *   "Any unusual cost spikes this month?"
 *   "Which services are growing fastest?"
 *   "Alert me if something increased by more than 30%"
 */

import { z } from "zod";
import { getRecords } from "@/lib/focus/store";
import { groupBy, sumCost, round2 } from "@/lib/focus/schema";
import type { McpToolHandler } from "@/lib/mcp/types";

// ── Input schema ──────────────────────────────────────────────────────────

const inputSchema = z.object({
  threshold_pct:        z.number().min(1).max(500).default(30),
  min_change_usd:       z.number().min(0).default(20),
  provider:             z.enum(["aws", "azure", "gcp", "openai", "anthropic", "all"]).default("all"),
  include_new_services: z.boolean().default(true),
  include_dropped:      z.boolean().default(false)
});

// ── Constants ─────────────────────────────────────────────────────────────

const PROVIDER_MAP: Record<string, string> = {
  aws: "Amazon Web Services", azure: "Microsoft Azure",
  gcp: "Google Cloud", openai: "OpenAI", anthropic: "Anthropic"
};

// ── Severity ──────────────────────────────────────────────────────────────

function severity(pct: number, threshold: number): "critical" | "high" | "medium" | "low" {
  if (pct >= 100) return "critical";
  if (pct >= 50)  return "high";
  if (pct >= 30)  return "medium";
  return "low";   // threshold < 30 only
}

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🚨",
  high:     "🔴",
  medium:   "🟡",
  low:      "🟢"
};

// ── Period helpers ────────────────────────────────────────────────────────

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function previousMonthKey(): string {
  const d = new Date(); d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleString("en-US", { month: "long", year: "numeric" });
}

function fmt(n: number, sign = false): string {
  const s = n.toLocaleString("en-US", { minimumFractionDigits: 2 });
  return sign ? (n >= 0 ? `+$${s}` : `-$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`) : `$${s}`;
}

// ── Tool definition ───────────────────────────────────────────────────────

export const detectAnomaliesTool: McpToolHandler = {
  definition: {
    name: "detect_anomalies",
    description: `Detects cost anomalies — services whose spend changed significantly month-over-month.
Automatically uses live data when cloud credentials are configured.
Use this for:
  - "Any unusual cost spikes this month?"
  - "Which services are growing fastest?"
  - "Alert me if anything increased by more than 30%"
  - "Show me new services that appeared this month"
Returns anomalies ranked by dollar impact, severity levels (critical/high/medium/low), and total excess spend.`,
    inputSchema: {
      type: "object",
      properties: {
        threshold_pct: {
          type: "number",
          description: "% increase to flag as anomaly (default 30). Use lower values like 15 for tighter monitoring."
        },
        min_change_usd: {
          type: "number",
          description: "Minimum $ change to avoid noise from tiny services (default $20)"
        },
        provider: {
          type: "string",
          enum: ["aws", "azure", "gcp", "openai", "anthropic", "all"],
          description: "Filter to a specific provider (default: all)"
        },
        include_new_services: {
          type: "boolean",
          description: "Flag services that appear for the first time this month (default true)"
        },
        include_dropped: {
          type: "boolean",
          description: "Include services that disappeared this month (default false)"
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

    const { threshold_pct, min_change_usd, provider, include_new_services, include_dropped } = parsed.data;
    const { records, source, providers: connectedProviders } = await getRecords();

    // Apply provider filter
    let filtered = [...records];
    if (provider !== "all") {
      filtered = filtered.filter((r) => r.ProviderName === PROVIDER_MAP[provider]);
    }

    const curKey  = currentMonthKey();
    const prevKey = previousMonthKey();

    const current  = filtered.filter((r) => r.BillingPeriodStart.slice(0, 7) === curKey);
    const previous = filtered.filter((r) => r.BillingPeriodStart.slice(0, 7) === prevKey);

    // Group by "provider::service" composite key for uniqueness
    const curByKey  = groupBy(current,  (r) => `${r.ProviderName}::${r.ServiceName}`);
    const prevByKey = groupBy(previous, (r) => `${r.ProviderName}::${r.ServiceName}`);
    const allKeys   = Array.from(new Set([...Object.keys(curByKey), ...Object.keys(prevByKey)]));

    // ── Build anomaly list ────────────────────────────────────────────────
    const spikes:   object[] = [];
    const newSvcs:  object[] = [];
    const dropped:  object[] = [];

    for (const key of allKeys) {
      const [providerName, serviceName] = key.split("::");
      const curCost  = round2(sumCost(curByKey[key]  ?? []));
      const prevCost = round2(sumCost(prevByKey[key] ?? []));
      const change   = round2(curCost - prevCost);
      const category = (curByKey[key] ?? prevByKey[key])[0].ServiceCategory;

      // ── New service (no prior spend)
      if (prevCost === 0 && curCost > 0) {
        if (include_new_services && curCost >= min_change_usd) {
          newSvcs.push({
            service:       serviceName,
            provider:      providerName,
            category,
            current_cost:  curCost,
            formatted:     fmt(curCost),
            note:          "New this month — no previous spend to compare"
          });
        }
        continue;
      }

      // ── Dropped service (had spend, now zero)
      if (curCost === 0 && prevCost > 0) {
        if (include_dropped && prevCost >= min_change_usd) {
          dropped.push({
            service:       serviceName,
            provider:      providerName,
            category,
            previous_cost: prevCost,
            formatted:     `-${fmt(prevCost)}`,
            note:          "No spend this month — service may have been removed or consolidated"
          });
        }
        continue;
      }

      // ── Spike or decrease
      if (change <= 0) continue;  // only flag increases
      const changePct = round2((change / prevCost) * 100);
      if (changePct < threshold_pct || change < min_change_usd) continue;

      spikes.push({
        type:           "spike",
        severity:       severity(changePct, threshold_pct),
        severity_icon:  SEVERITY_EMOJI[severity(changePct, threshold_pct)],
        service:        serviceName,
        provider:       providerName,
        category,
        previous_cost:  prevCost,
        current_cost:   curCost,
        change_usd:     change,
        change_pct:     changePct,
        formatted_change: `+${fmt(change, false)} (+${changePct}%)`,
        explanation:    `Cost rose ${changePct}% (${fmt(change, true)}) month-over-month — above ${threshold_pct}% threshold`
      });
    }

    // Sort spikes by dollar impact
    const sortedSpikes = (spikes as Array<{ change_usd: number }>)
      .sort((a, b) => b.change_usd - a.change_usd)
      .map((s, i) => ({ rank: i + 1, ...s }));

    // Sort new services by cost desc
    const sortedNew = (newSvcs as Array<{ current_cost: number }>)
      .sort((a, b) => b.current_cost - a.current_cost);

    // Totals
    const totalExcess = round2(
      sortedSpikes.reduce((sum, s) => sum + (s as { change_usd: number }).change_usd, 0)
    );
    const curTotal  = round2(sumCost(current));
    const prevTotal = round2(sumCost(previous));

    // ── Summary sentence ─────────────────────────────────────────────────
    const anomalyCount = sortedSpikes.length;
    const newCount     = sortedNew.length;
    let summaryParts: string[] = [];
    if (anomalyCount > 0) {
      summaryParts.push(`${anomalyCount} cost spike${anomalyCount !== 1 ? "s" : ""} detected — ${fmt(totalExcess)} in excess spend`);
    }
    if (newCount > 0) {
      const newTotal = round2((sortedNew as Array<{ current_cost: number }>).reduce((s, n) => s + n.current_cost, 0));
      summaryParts.push(`${newCount} new service${newCount !== 1 ? "s" : ""} (${fmt(newTotal)} new spend)`);
    }
    if (summaryParts.length === 0) {
      summaryParts.push(`No anomalies detected above ${threshold_pct}% / ${fmt(min_change_usd)} threshold`);
    }

    const result: Record<string, unknown> = {
      summary:      summaryParts.join(" · "),
      thresholds:   { min_increase_pct: threshold_pct, min_change_usd },
      analysis_period: {
        current:        curKey,
        current_label:  monthLabel(curKey),
        previous:       prevKey,
        previous_label: monthLabel(prevKey),
        current_total:  fmt(curTotal),
        previous_total: fmt(prevTotal)
      },
      anomaly_count:    anomalyCount,
      total_excess_spend: fmt(totalExcess),
      total_excess_raw:   totalExcess,
      anomalies:          sortedSpikes,
      data_source:        source,
      connected_providers: connectedProviders
    };

    if (include_new_services && sortedNew.length > 0) {
      result.new_services = sortedNew;
    }
    if (include_dropped && dropped.length > 0) {
      result.dropped_services = dropped;
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    };
  }
};
