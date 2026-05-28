/**
 * Data store — single place that decides whether to serve live or sample data.
 *
 * Priority (all run in parallel, results aggregated):
 *   1. AWS    (if AWS_ACCESS_KEY_ID set)
 *   2. Azure  (if AZURE_TENANT_ID + AZURE_CLIENT_ID + AZURE_CLIENT_SECRET + AZURE_SUBSCRIPTION_ID set)
 *   3. GCP    (if GCP_SERVICE_ACCOUNT_KEY + GCP_BILLING_BIGQUERY_TABLE set)
 *   4. Sample data fallback (if no live providers contributed)
 */

import { SAMPLE_DATA }      from "./sample-data";
import { fetchAwsRecords, checkAwsConnection }     from "./adapters/aws";
import { fetchAzureRecords, checkAzureConnection } from "./adapters/azure";
import { fetchGcpRecords, checkGcpConnection }     from "./adapters/gcp";
import type { FocusRecord } from "./schema";
import { logger } from "@/lib/utils/logger";

export type DataSource = "live" | "sample";

export interface StoreResult {
  records:    FocusRecord[];
  source:     DataSource;
  providers:  string[];
  note?:      string;
}

/** Returns the best available dataset for tool calls. */
export async function getRecords(): Promise<StoreResult> {
  const liveRecords:   FocusRecord[] = [];
  const liveProviders: string[]      = [];

  // Fire all adapter calls in parallel — adapter is responsible for checking
  // its own credentials and returning empty on failure
  const [aws, azure, gcp] = await Promise.all([
    fetchAwsRecords().catch((e) => ({ records: [], months: [], fetched: false, error: String(e) })),
    fetchAzureRecords().catch((e) => ({ records: [], months: [], fetched: false, error: String(e) })),
    fetchGcpRecords().catch((e) => ({ records: [], months: [], fetched: false, error: String(e) }))
  ]);

  if (aws.fetched && aws.records.length > 0) {
    liveRecords.push(...aws.records);
    liveProviders.push("Amazon Web Services");
    logger.info({ count: aws.records.length }, "store: using live AWS data");
  } else if (process.env.AWS_ACCESS_KEY_ID) {
    logger.warn({ error: aws.error }, "AWS configured but fetch failed");
  }

  if (azure.fetched && azure.records.length > 0) {
    liveRecords.push(...azure.records);
    liveProviders.push("Microsoft Azure");
    logger.info({ count: azure.records.length }, "store: using live Azure data");
  } else if (process.env.AZURE_TENANT_ID) {
    logger.warn({ error: azure.error }, "Azure configured but fetch failed");
  }

  if (gcp.fetched && gcp.records.length > 0) {
    liveRecords.push(...gcp.records);
    liveProviders.push("Google Cloud");
    logger.info({ count: gcp.records.length }, "store: using live GCP data");
  } else if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
    logger.warn({ error: gcp.error }, "GCP configured but fetch failed");
  }

  if (liveRecords.length > 0) {
    return { records: liveRecords, source: "live", providers: liveProviders };
  }

  return {
    records:   SAMPLE_DATA,
    source:    "sample",
    providers: [],
    note:      "Using sample FOCUS data. Add cloud credentials via /connect for live figures."
  };
}

/** Connection status for the /connect page and /api/health endpoint. */
export async function getConnectionStatus() {
  const [aws, azure, gcp] = await Promise.all([
    checkAwsConnection().catch((e)   => ({ connected: false, error: String(e) })),
    checkAzureConnection().catch((e) => ({ connected: false, error: String(e) })),
    checkGcpConnection().catch((e)   => ({ connected: false, error: String(e) }))
  ]);

  return {
    aws: {
      configured: !!process.env.AWS_ACCESS_KEY_ID,
      connected:  aws.connected,
      error:      aws.error
    },
    azure: {
      configured: !!process.env.AZURE_TENANT_ID,
      connected:  azure.connected,
      error:      azure.error
    },
    gcp: {
      configured: !!process.env.GCP_SERVICE_ACCOUNT_KEY,
      connected:  gcp.connected,
      error:      gcp.error
    },
    openai: {
      configured: !!process.env.OPENAI_API_KEY,
      connected:  false,
      note:       "Coming in Week 6"
    },
    anthropic: {
      configured: !!process.env.ANTHROPIC_API_KEY,
      connected:  false,
      note:       "Coming in Week 6"
    }
  };
}
