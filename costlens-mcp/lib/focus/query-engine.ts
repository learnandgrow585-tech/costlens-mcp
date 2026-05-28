import { SAMPLE_DATA } from "./sample-data";
import { groupBy, sumCost, round2, type FocusRecord } from "./schema";

export type Period = "current_month" | "last_month" | "all";

export interface CostBreakdownItem {
  label:      string;
  cost:       number;
  currency:   string;
  percentage: number;
}

export interface QueryResult {
  answer:           string;
  total:            number;
  currency:         string;
  period:           string;
  breakdown:        CostBreakdownItem[];
  record_count:     number;
  data_source:      "sample" | "live";
  confidence_score: number;
  note?:            string;
}

// ── Period helpers ──────────────────────────────────────────────────────────

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastMonthKey(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function recordMonth(r: FocusRecord): string {
  return r.BillingPeriodStart.slice(0, 7);
}

export function filterByPeriod(records: FocusRecord[], period: Period): FocusRecord[] {
  if (period === "all") return records;
  const key = period === "current_month" ? currentMonthKey() : lastMonthKey();
  return records.filter((r) => recordMonth(r) === key);
}

export function periodLabel(period: Period): string {
  if (period === "all") return "all time";
  if (period === "current_month") {
    const d = new Date();
    return `this month (${d.toLocaleString("en-US", { month: "long", year: "numeric" })})`;
  }
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `last month (${d.toLocaleString("en-US", { month: "long", year: "numeric" })})`;
}

// ── Provider filter ─────────────────────────────────────────────────────────

export function filterByProvider(records: FocusRecord[], provider: string): FocusRecord[] {
  const q = provider.toLowerCase();
  return records.filter((r) => r.ProviderName.toLowerCase().includes(q));
}

// ── Intent detection ────────────────────────────────────────────────────────

interface Intent {
  provider?: string;
  period:    Period;
  category?: string;
  mode:      "total" | "top_services" | "breakdown_category" | "compare";
  confidence: number;
}

function detectIntent(question: string): Intent {
  const q = question.toLowerCase();
  const intent: Intent = { period: "current_month", mode: "top_services", confidence: 0.8 };

  // Period
  if (q.includes("last month") || q.includes("previous month") || q.includes("april")) {
    intent.period = "last_month";
  } else if (q.includes("all time") || q.includes("all months")) {
    intent.period = "all";
  }

  // Provider
  if (q.includes("aws") || q.includes("amazon")) intent.provider = "Amazon Web Services";
  else if (q.includes("azure") || q.includes("microsoft")) intent.provider = "Microsoft Azure";
  else if (q.includes("gcp") || q.includes("google cloud") || q.includes("google")) intent.provider = "Google Cloud";
  else if (q.includes("openai")) intent.provider = "OpenAI";
  else if (q.includes("anthropic") || q.includes("claude")) intent.provider = "Anthropic";

  // Category
  if (q.includes("ai") || q.includes("machine learning") || q.includes("llm") || q.includes("model")) {
    intent.category = "AI and Machine Learning";
  } else if (q.includes("compute") || q.includes("vm") || q.includes("ec2")) {
    intent.category = "Compute";
  } else if (q.includes("storage") || q.includes("s3") || q.includes("blob")) {
    intent.category = "Storage";
  } else if (q.includes("database") || q.includes("rds") || q.includes("sql")) {
    intent.category = "Databases";
  }

  // Mode
  if (q.includes("total") || q.includes("how much") || q.includes("spend") || q.includes("cost")) {
    intent.mode = "total";
  }
  if (q.includes("top") || q.includes("biggest") || q.includes("most expensive") || q.includes("breakdown")) {
    intent.mode = "top_services";
  }
  if (q.includes("compare") || q.includes("month over month") || q.includes("vs ")) {
    intent.mode = "compare"; intent.period = "all";
  }
  if (intent.provider || intent.category) intent.confidence = 0.92;
  if (!intent.provider && !intent.category && intent.mode === "total") intent.confidence = 0.75;

  return intent;
}

// ── Core query function — accepts optional records param ───────────────────

export function queryCosts(
  question: string,
  records: FocusRecord[] = SAMPLE_DATA,
  source: "sample" | "live" = "sample"
): QueryResult {
  const intent = detectIntent(question);
  let filtered = [...records];

  if (intent.provider) filtered = filterByProvider(filtered, intent.provider);
  if (intent.category) filtered = filtered.filter((r) => r.ServiceCategory === intent.category);
  filtered = filterByPeriod(filtered, intent.period);

  if (filtered.length === 0) {
    return {
      answer: `No cost data found for: "${question}". Try asking about AWS, Azure, GCP, OpenAI, or Anthropic costs.`,
      total: 0, currency: "USD",
      period: periodLabel(intent.period),
      breakdown: [], record_count: 0,
      data_source: source, confidence_score: 0.3
    };
  }

  const total  = round2(sumCost(filtered));
  const pLabel = periodLabel(intent.period);

  if (intent.mode === "compare") return buildComparison(filtered, records, intent.confidence, source);

  const byService  = groupBy(filtered, (r) => r.ServiceName);
  const breakdown: CostBreakdownItem[] = Object.entries(byService)
    .map(([label, recs]) => ({
      label, cost: round2(sumCost(recs)), currency: "USD", percentage: 0
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10)
    .map((b) => ({ ...b, percentage: total > 0 ? round2((b.cost / total) * 100) : 0 }));

  const providerStr = intent.provider ?? "all providers";
  const categoryStr = intent.category ? ` (${intent.category})` : "";
  const topService  = breakdown[0];
  const answer = intent.mode === "total"
    ? `Total spend for ${providerStr}${categoryStr} ${pLabel}: $${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : `Top services for ${providerStr}${categoryStr} ${pLabel}: highest is ${topService?.label} at $${topService?.cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return {
    answer, total, currency: "USD", period: pLabel,
    breakdown, record_count: filtered.length,
    data_source: source, confidence_score: intent.confidence,
    ...(source === "sample"
      ? { note: "Using sample FOCUS data. Add AWS credentials via /connect for live figures." }
      : {}
    )
  };
}

function buildComparison(
  _filtered: FocusRecord[],
  allRecords: FocusRecord[],
  confidence: number,
  source: "sample" | "live"
): QueryResult {
  const currentKey = currentMonthKey();
  const lastKey    = lastMonthKey();
  const current    = allRecords.filter((r) => recordMonth(r) === currentKey);
  const last       = allRecords.filter((r) => recordMonth(r) === lastKey);
  const currentTotal = round2(sumCost(current));
  const lastTotal    = round2(sumCost(last));
  const delta        = round2(currentTotal - lastTotal);
  const pct          = lastTotal > 0 ? round2((delta / lastTotal) * 100) : 0;
  const dir          = delta >= 0 ? "up" : "down";

  return {
    answer: `Month-over-month: this month ($${currentTotal.toLocaleString()}) vs last month ($${lastTotal.toLocaleString()}) — ${dir} $${Math.abs(delta).toLocaleString()} (${Math.abs(pct)}%)`,
    total: currentTotal, currency: "USD",
    period: "month-over-month comparison",
    breakdown: [
      { label: "Last month",  cost: lastTotal,    currency: "USD", percentage: 0 },
      { label: "This month",  cost: currentTotal, currency: "USD", percentage: 0 }
    ],
    record_count: current.length + last.length,
    data_source: source, confidence_score: confidence
  };
}

// ── Dashboard helper functions (use SAMPLE_DATA — always sync/fast) ────────
// These power the ProviderCards component which renders server-side.
// For live data in the dashboard, use the MCP playground tab.

export function getTopServicesSummary(records: FocusRecord[] = SAMPLE_DATA): CostBreakdownItem[] {
  const current = filterByPeriod(records, "current_month");
  const total   = sumCost(current);
  return Object.entries(groupBy(current, (r) => r.ServiceName))
    .map(([label, recs]) => ({ label, cost: round2(sumCost(recs)), currency: "USD", percentage: 0 }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 8)
    .map((b) => ({ ...b, percentage: round2((b.cost / total) * 100) }));
}

export function getTotalByProvider(records: FocusRecord[] = SAMPLE_DATA): CostBreakdownItem[] {
  const current = filterByPeriod(records, "current_month");
  const total   = sumCost(current);
  return Object.entries(groupBy(current, (r) => r.ProviderName))
    .map(([label, recs]) => ({ label, cost: round2(sumCost(recs)), currency: "USD", percentage: 0 }))
    .sort((a, b) => b.cost - a.cost)
    .map((b) => ({ ...b, percentage: round2((b.cost / total) * 100) }));
}

export function getCurrentMonthTotal(records: FocusRecord[] = SAMPLE_DATA): number {
  return round2(sumCost(filterByPeriod(records, "current_month")));
}

export function getLastMonthTotal(records: FocusRecord[] = SAMPLE_DATA): number {
  return round2(sumCost(filterByPeriod(records, "last_month")));
}
