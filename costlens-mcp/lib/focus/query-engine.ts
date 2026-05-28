import { SAMPLE_DATA } from "./sample-data";
import { groupBy, sumCost, round2, type FocusRecord } from "./schema";

export type Period = "current_month" | "last_month" | "all";

export interface CostBreakdownItem {
  label: string;
  cost: number;
  currency: string;
  percentage: number;
}

export interface QueryResult {
  answer: string;
  total: number;
  currency: string;
  period: string;
  breakdown: CostBreakdownItem[];
  record_count: number;
  data_source: "sample" | "live";
  confidence_score: number;
  note?: string;
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

function recordMonth(r: FocusRecord): string {
  return r.BillingPeriodStart.slice(0, 7);
}

function filterByPeriod(records: FocusRecord[], period: Period): FocusRecord[] {
  if (period === "all") return records;
  const key = period === "current_month" ? currentMonthKey() : lastMonthKey();
  return records.filter((r) => recordMonth(r) === key);
}

function periodLabel(period: Period): string {
  if (period === "all") return "all time";
  if (period === "current_month") return "this month (May 2026)";
  return "last month (April 2026)";
}

// ── Provider filter ─────────────────────────────────────────────────────────

function filterByProvider(records: FocusRecord[], provider: string): FocusRecord[] {
  const q = provider.toLowerCase();
  return records.filter((r) => r.ProviderName.toLowerCase().includes(q));
}

// ── Intent detection ────────────────────────────────────────────────────────

interface Intent {
  provider?: string;
  period: Period;
  category?: string;
  service?: string;
  mode: "total" | "top_services" | "breakdown_category" | "compare";
  confidence: number;
}

function detectIntent(question: string): Intent {
  const q = question.toLowerCase();
  const intent: Intent = {
    period: "current_month",
    mode: "top_services",
    confidence: 0.8
  };

  // Period
  if (q.includes("last month") || q.includes("previous month") || q.includes("april")) {
    intent.period = "last_month";
  } else if (q.includes("all time") || q.includes("all months") || q.includes("total all")) {
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
  } else if (q.includes("compute") || q.includes("vm") || q.includes("ec2") || q.includes("virtual machine")) {
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
    intent.mode = "compare";
    intent.period = "all";
  }
  if (q.includes("category") || q.includes("by type")) {
    intent.mode = "breakdown_category";
  }

  // Confidence boost
  if (intent.provider || intent.category) intent.confidence = 0.92;
  if (!intent.provider && !intent.category && intent.mode === "total") intent.confidence = 0.75;

  return intent;
}

// ── Main query function ─────────────────────────────────────────────────────

export function queryCosts(question: string): QueryResult {
  const intent = detectIntent(question);
  let records = [...SAMPLE_DATA];

  if (intent.provider) records = filterByProvider(records, intent.provider);
  if (intent.category) records = records.filter((r) => r.ServiceCategory === intent.category);
  records = filterByPeriod(records, intent.period);

  if (records.length === 0) {
    return {
      answer: `No cost data found for: "${question}". Try asking about AWS, Azure, GCP, OpenAI, or Anthropic costs.`,
      total: 0, currency: "USD",
      period: periodLabel(intent.period),
      breakdown: [], record_count: 0,
      data_source: "sample", confidence_score: 0.3
    };
  }

  const total = round2(sumCost(records));
  const pLabel = periodLabel(intent.period);

  // Compare mode
  if (intent.mode === "compare") {
    return buildComparison(records, question, intent.confidence);
  }

  // Build breakdown by service
  const byService = groupBy(records, (r) => r.ServiceName);
  const breakdown: CostBreakdownItem[] = Object.entries(byService)
    .map(([label, recs]) => ({
      label,
      cost: round2(sumCost(recs)),
      currency: "USD",
      percentage: 0
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10);

  breakdown.forEach((b) => {
    b.percentage = total > 0 ? round2((b.cost / total) * 100) : 0;
  });

  const providerStr = intent.provider ?? "all providers";
  const categoryStr = intent.category ? ` (${intent.category})` : "";
  const answer =
    intent.mode === "total"
      ? `Total spend for ${providerStr}${categoryStr} ${pLabel}: $${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : `Top services by cost for ${providerStr}${categoryStr} ${pLabel}: highest is ${breakdown[0]?.label} at $${breakdown[0]?.cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return {
    answer,
    total,
    currency: "USD",
    period: pLabel,
    breakdown,
    record_count: records.length,
    data_source: "sample",
    confidence_score: intent.confidence,
    note: "Using sample FOCUS data. Connect real cloud accounts (Week 4) for live figures."
  };
}

function buildComparison(records: FocusRecord[], question: string, confidence: number): QueryResult {
  const currentKey = currentMonthKey();
  const lastKey = lastMonthKey();

  const currentRecords = records.filter((r) => recordMonth(r) === currentKey);
  const lastRecords    = records.filter((r) => recordMonth(r) === lastKey);

  const currentTotal = round2(sumCost(currentRecords));
  const lastTotal    = round2(sumCost(lastRecords));
  const delta        = round2(currentTotal - lastTotal);
  const deltaPercent = lastTotal > 0 ? round2((delta / lastTotal) * 100) : 0;
  const direction    = delta >= 0 ? "up" : "down";

  const breakdown: CostBreakdownItem[] = [
    { label: "April 2026",  cost: lastTotal,    currency: "USD", percentage: 0 },
    { label: "May 2026",    cost: currentTotal, currency: "USD", percentage: 0 }
  ];

  return {
    answer: `Month-over-month: May 2026 ($${currentTotal.toLocaleString()}) vs April 2026 ($${lastTotal.toLocaleString()}) — ${direction} $${Math.abs(delta).toLocaleString()} (${Math.abs(deltaPercent)}%)`,
    total: currentTotal,
    currency: "USD",
    period: "month-over-month comparison",
    breakdown,
    record_count: records.length,
    data_source: "sample",
    confidence_score: confidence,
    note: "Using sample FOCUS data. Connect real cloud accounts (Week 4) for live figures."
  };
}

// ── Pre-built queries for the dashboard ────────────────────────────────────

export function getTopServicesSummary(): CostBreakdownItem[] {
  const current = filterByPeriod(SAMPLE_DATA, "current_month");
  const total   = sumCost(current);
  const byService = groupBy(current, (r) => r.ServiceName);

  return Object.entries(byService)
    .map(([label, recs]) => ({
      label,
      cost: round2(sumCost(recs)),
      currency: "USD",
      percentage: 0
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 8)
    .map((b) => ({ ...b, percentage: round2((b.cost / total) * 100) }));
}

export function getTotalByProvider(): CostBreakdownItem[] {
  const current = filterByPeriod(SAMPLE_DATA, "current_month");
  const total   = sumCost(current);
  const byProvider = groupBy(current, (r) => r.ProviderName);

  return Object.entries(byProvider)
    .map(([label, recs]) => ({
      label,
      cost: round2(sumCost(recs)),
      currency: "USD",
      percentage: 0
    }))
    .sort((a, b) => b.cost - a.cost)
    .map((b) => ({ ...b, percentage: round2((b.cost / total) * 100) }));
}

export function getCurrentMonthTotal(): number {
  return round2(sumCost(filterByPeriod(SAMPLE_DATA, "current_month")));
}

export function getLastMonthTotal(): number {
  return round2(sumCost(filterByPeriod(SAMPLE_DATA, "last_month")));
}
