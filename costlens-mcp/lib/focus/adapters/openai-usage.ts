/**
 * OpenAI → FOCUS 1.2 adapter.
 *
 * Fetches organisation-level cost data from the OpenAI Usage API.
 *
 * Requires env var:
 *   OPENAI_API_KEY — Must be an Admin API key with "Usage Reporting" scope.
 *                    Regular sk- keys receive 403 from the costs endpoint.
 *                    Create one at: platform.openai.com/settings/organization/admin-keys
 *
 * Connection check uses the lightweight /v1/models endpoint, which works
 * with any valid API key (regular or admin).
 *
 * Cost: The OpenAI Usage API has no charge.
 */

import type { FocusRecord } from "@/lib/focus/schema";
import { logger } from "@/lib/utils/logger";

// ── Types ─────────────────────────────────────────────────────────────────

interface BucketResult {
  amount:    { value: number; currency: string };
  line_item?: string | null;
  project_id?: string | null;
}

interface CostBucket {
  object:     "bucket";
  start_time: number;
  end_time:   number;
  results:    BucketResult[];
}

interface CostsPage {
  object:     string;
  data:       CostBucket[];
  has_more:   boolean;
  next_page?: string | null;
}

// ── Date helpers ──────────────────────────────────────────────────────────

function monthBounds(offset = 0): {
  startUnix: number;
  endUnix:   number;
  isoStart:  string;
  isoEnd:    string;
  key:       string;
} {
  const now = new Date();
  const s   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const e   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 0, 23, 59, 59));
  return {
    startUnix: Math.floor(s.getTime() / 1000),
    endUnix:   Math.floor(e.getTime() / 1000),
    isoStart:  s.toISOString().slice(0, 10) + "T00:00:00Z",
    isoEnd:    e.toISOString().slice(0, 10) + "T23:59:59Z",
    key:       `${s.getUTCFullYear()}-${String(s.getUTCMonth() + 1).padStart(2, "0")}`
  };
}

// ── API helpers ───────────────────────────────────────────────────────────

async function fetchCostBuckets(
  startUnix: number,
  endUnix:   number,
  apiKey:    string
): Promise<CostBucket[]> {
  const url = new URL("https://api.openai.com/v1/organization/usage/costs");
  url.searchParams.set("start_time",   String(startUnix));
  url.searchParams.set("end_time",     String(endUnix));
  url.searchParams.set("limit",        "31");
  url.searchParams.set("bucket_width", "1d");

  const res = await fetch(url.toString(), {
    headers: { "Authorization": `Bearer ${apiKey}` }
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 403) {
      throw new Error(
        "OpenAI API key lacks 'Usage Reporting' scope. " +
        "Create an Admin API key at platform.openai.com/settings/organization/admin-keys"
      );
    }
    throw new Error(`OpenAI usage API error (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = await res.json() as CostsPage;
  return json.data ?? [];
}

function bucketsToTotal(buckets: CostBucket[]): number {
  return buckets.reduce(
    (sum, b) => sum + b.results.reduce((s, r) => s + (r.amount?.value ?? 0), 0),
    0
  );
}

// ── Public API ────────────────────────────────────────────────────────────

export interface OpenAiAdapterResult {
  records: FocusRecord[];
  months:  string[];
  fetched: boolean;
  error?:  string;
}

export async function fetchOpenAiRecords(): Promise<OpenAiAdapterResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { records: [], months: [], fetched: false, error: "OPENAI_API_KEY not set" };
  }

  try {
    const current  = monthBounds(0);
    const previous = monthBounds(-1);

    logger.info({ current: current.key, previous: previous.key }, "fetching OpenAI usage costs");

    const [curBuckets, prevBuckets] = await Promise.all([
      fetchCostBuckets(current.startUnix,  current.endUnix,  apiKey),
      fetchCostBuckets(previous.startUnix, previous.endUnix, apiKey)
    ]);

    const records: FocusRecord[] = [];

    const push = (buckets: CostBucket[], b: typeof current) => {
      const total = Math.round(bucketsToTotal(buckets) * 100) / 100;
      if (total <= 0) return;
      records.push({
        ProviderName:       "OpenAI",
        ServiceName:        "OpenAI API",
        ServiceCategory:    "AI and Machine Learning",
        BillingPeriodStart: b.isoStart,
        BillingPeriodEnd:   b.isoEnd,
        BilledCost:         total,
        EffectiveCost:      total,
        BillingCurrency:    "USD",
        ChargeType:         "Usage",
        ChargeDescription:  "OpenAI API token usage (all models)"
      });
    };

    push(curBuckets,  current);
    push(prevBuckets, previous);

    logger.info({ count: records.length }, "OpenAI records built");
    return { records, months: [previous.key, current.key], fetched: records.length > 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "OpenAI adapter fetch failed");
    return { records: [], months: [], fetched: false, error: message };
  }
}

/** Verifies API key is valid (works with any sk- key, not just admin). */
export async function checkOpenAiConnection(): Promise<{ connected: boolean; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { connected: false, error: "OPENAI_API_KEY not set" };
  }
  try {
    const res = await fetch("https://api.openai.com/v1/models?limit=1", {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    if (!res.ok) {
      const text = await res.text();
      return { connected: false, error: `OpenAI API error (${res.status}): ${text.slice(0, 100)}` };
    }
    return { connected: true };
  } catch (err) {
    return { connected: false, error: err instanceof Error ? err.message : String(err) };
  }
}
