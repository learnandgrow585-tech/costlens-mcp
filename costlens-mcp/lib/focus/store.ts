/**
 * Data store — single place that decides whether to serve live or sample data.
 *
 * Priority:
 *   1. AWS (if AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY set)
 *   2. Sample data fallback
 *
 * Future weeks add Azure (Week 5) and GCP (Week 5) to the priority chain.
 */

import { SAMPLE_DATA } from "./sample-data";
import { fetchAwsRecords } from "./adapters/aws";
import type { FocusRecord } from "./schema";
import { logger } from "@/lib/utils/logger";

export type DataSource = "live" | "sample";

export interface StoreResult {
  records:    FocusRecord[];
  source:     DataSource;
  providers:  string[];   // which live providers contributed
  note?:      string;
}

/**
 * Returns the best available dataset for tool calls.
 * Always resolves — never throws — falls back to sample on any error.
 */
export async function getRecords(): Promise<StoreResult> {
  const liveRecords: FocusRecord[] = [];
  const liveProviders: string[]    = [];

  // ── AWS ────────────────────────────────────────────────────────────────
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    const aws = await fetchAwsRecords();
    if (aws.fetched && aws.records.length > 0) {
      liveRecords.push(...aws.records);
      liveProviders.push("Amazon Web Services");
      logger.info({ count: aws.records.length }, "store: using live AWS data");
    } else {
      logger.warn({ error: aws.error }, "store: AWS fetch failed, continuing");
    }
  }

  // ── Azure (Week 5) ─────────────────────────────────────────────────────
  // if (process.env.AZURE_CLIENT_ID) { ... }

  // ── GCP (Week 5) ───────────────────────────────────────────────────────
  // if (process.env.GCP_SERVICE_ACCOUNT_KEY) { ... }

  // ── Return live if we got anything, otherwise sample ──────────────────
  if (liveRecords.length > 0) {
    return {
      records:   liveRecords,
      source:    "live",
      providers: liveProviders
    };
  }

  return {
    records:   SAMPLE_DATA,
    source:    "sample",
    providers: [],
    note:      "Using sample FOCUS data. Add AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY to Vercel env vars for live data."
  };
}

/** Connection status for the /connect page and /api/health endpoint. */
export async function getConnectionStatus() {
  const { checkAwsConnection } = await import("./adapters/aws");
  const aws = await checkAwsConnection();

  return {
    aws: {
      configured: !!process.env.AWS_ACCESS_KEY_ID,
      connected:  aws.connected,
      error:      aws.error
    },
    azure: {
      configured: !!process.env.AZURE_CLIENT_ID,
      connected:  false,
      note:       "Coming in Week 5"
    },
    gcp: {
      configured: !!process.env.GCP_SERVICE_ACCOUNT_KEY,
      connected:  false,
      note:       "Coming in Week 5"
    },
    openai: {
      configured: !!process.env.OPENAI_API_KEY,
      connected:  !!process.env.OPENAI_API_KEY,
      note:       "Coming in Week 6"
    },
    anthropic: {
      configured: !!process.env.ANTHROPIC_API_KEY,
      connected:  !!process.env.ANTHROPIC_API_KEY,
      note:       "Coming in Week 6"
    }
  };
}
