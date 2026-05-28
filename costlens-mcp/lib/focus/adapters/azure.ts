/**
 * Azure Cost Management → FOCUS 1.2 adapter.
 *
 * Requires env vars:
 *   AZURE_TENANT_ID         — Azure AD tenant ID
 *   AZURE_CLIENT_ID         — Service principal app ID
 *   AZURE_CLIENT_SECRET     — Service principal secret
 *   AZURE_SUBSCRIPTION_ID   — Subscription to query
 *
 * Permissions needed (least privilege):
 *   Role: "Cost Management Reader" on the subscription
 *
 * Cost: Azure Cost Management API is free for queries.
 */

import type { FocusRecord, ServiceCategory } from "@/lib/focus/schema";
import { logger } from "@/lib/utils/logger";

// ── Service name → FOCUS ServiceCategory mapping ──────────────────────────

const SERVICE_CATEGORY_MAP: Record<string, ServiceCategory> = {
  "Virtual Machines":             "Compute",
  "App Service":                  "Compute",
  "Azure Kubernetes Service":     "Compute",
  "Container Instances":          "Compute",
  "Functions":                    "Compute",
  "Storage":                      "Storage",
  "Blob Storage":                 "Storage",
  "Files":                        "Storage",
  "Disks":                        "Storage",
  "Backup":                       "Storage",
  "SQL Database":                 "Databases",
  "Cosmos DB":                    "Databases",
  "Azure Database for PostgreSQL":"Databases",
  "Azure Database for MySQL":     "Databases",
  "Cache for Redis":              "Databases",
  "Azure OpenAI":                 "AI and Machine Learning",
  "Azure OpenAI Service":         "AI and Machine Learning",
  "Machine Learning":             "AI and Machine Learning",
  "Cognitive Services":           "AI and Machine Learning",
  "Bot Service":                  "AI and Machine Learning",
  "Bandwidth":                    "Networking",
  "Virtual Network":              "Networking",
  "Load Balancer":                "Networking",
  "Application Gateway":          "Networking",
  "CDN":                          "Networking",
  "Front Door":                   "Networking",
  "DNS":                          "Networking",
  "Key Vault":                    "Security",
  "Security Center":              "Security",
  "Sentinel":                     "Security",
  "Active Directory B2C":         "Security",
  "Monitor":                      "Management",
  "Log Analytics":                "Management",
  "Application Insights":         "Management",
  "Automation":                   "Management"
};

function getCategory(serviceName: string): ServiceCategory {
  if (SERVICE_CATEGORY_MAP[serviceName]) return SERVICE_CATEGORY_MAP[serviceName];
  const lower = serviceName.toLowerCase();
  for (const [key, cat] of Object.entries(SERVICE_CATEGORY_MAP)) {
    if (lower.includes(key.toLowerCase())) return cat;
  }
  return "Other";
}

// ── Date helpers ──────────────────────────────────────────────────────────

function toYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthRange(offset = 0): { start: string; end: string; key: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return {
    start: toYYYYMMDD(start),
    end:   toYYYYMMDD(end),
    key:   `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`
  };
}

// ── OAuth2 — get access token ─────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Cache token for ~50 minutes (Azure tokens last 60 min)
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const tenantId     = process.env.AZURE_TENANT_ID!;
  const clientId     = process.env.AZURE_CLIENT_ID!;
  const clientSecret = process.env.AZURE_CLIENT_SECRET!;

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type:    "client_credentials",
    client_id:     clientId,
    client_secret: clientSecret,
    scope:         "https://management.azure.com/.default"
  });

  const response = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Azure auth failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 600) * 1000  // refresh 10 min early
  };
  return data.access_token;
}

// ── Cost Management query ─────────────────────────────────────────────────

interface AzureCostRow {
  cost:         number;
  serviceName:  string;
  currency:     string;
  billingMonth: string;
}

interface AzureQueryResponse {
  properties?: {
    columns?: Array<{ name: string; type: string }>;
    rows?:    Array<Array<string | number>>;
  };
}

async function queryCostManagement(
  subscriptionId: string,
  startDate: string,
  endDate: string,
  token: string
): Promise<AzureCostRow[]> {
  const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`;

  const body = {
    type: "ActualCost",
    timeframe: "Custom",
    timePeriod: { from: `${startDate}T00:00:00+00:00`, to: `${endDate}T23:59:59+00:00` },
    dataSet: {
      granularity: "Monthly",
      aggregation: {
        totalCost: { name: "PreTaxCost", function: "Sum" }
      },
      grouping: [
        { type: "Dimension", name: "ServiceName" }
      ]
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Azure Cost Management query failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const json = await response.json() as AzureQueryResponse;
  const columns = json.properties?.columns ?? [];
  const rows    = json.properties?.rows ?? [];

  // Build column index map
  const colIdx: Record<string, number> = {};
  columns.forEach((c, i) => { colIdx[c.name] = i; });

  const costIdx     = colIdx["PreTaxCost"];
  const serviceIdx  = colIdx["ServiceName"];
  const currencyIdx = colIdx["Currency"];
  const monthIdx    = colIdx["BillingMonth"];

  return rows
    .filter((row) => Number(row[costIdx]) > 0)
    .map((row) => ({
      cost:         Number(row[costIdx]),
      serviceName:  String(row[serviceIdx]),
      currency:     String(row[currencyIdx] ?? "USD"),
      billingMonth: String(row[monthIdx] ?? "")
    }));
}

// ── Public API ────────────────────────────────────────────────────────────

export interface AzureAdapterResult {
  records:  FocusRecord[];
  months:   string[];
  fetched:  boolean;
  error?:   string;
}

/**
 * Fetch 2 months of Azure cost data (current + previous).
 */
export async function fetchAzureRecords(): Promise<AzureAdapterResult> {
  if (
    !process.env.AZURE_TENANT_ID ||
    !process.env.AZURE_CLIENT_ID ||
    !process.env.AZURE_CLIENT_SECRET ||
    !process.env.AZURE_SUBSCRIPTION_ID
  ) {
    return { records: [], months: [], fetched: false, error: "Azure credentials not configured" };
  }

  try {
    const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID!;
    const token = await getAccessToken();

    const currentRange  = monthRange(0);
    const previousRange = monthRange(-1);

    logger.info({ currentRange, previousRange }, "fetching Azure Cost Management data");

    const [current, previous] = await Promise.all([
      queryCostManagement(subscriptionId, currentRange.start,  currentRange.end,  token),
      queryCostManagement(subscriptionId, previousRange.start, previousRange.end, token)
    ]);

    const records: FocusRecord[] = [];
    const buildRecords = (rows: AzureCostRow[], rangeStart: string, rangeEnd: string) => {
      for (const r of rows) {
        const cost = Math.round(r.cost * 100) / 100;
        records.push({
          ProviderName:       "Microsoft Azure",
          ServiceName:        r.serviceName,
          ServiceCategory:    getCategory(r.serviceName),
          BillingPeriodStart: `${rangeStart}T00:00:00Z`,
          BillingPeriodEnd:   `${rangeEnd}T23:59:59Z`,
          BilledCost:         cost,
          EffectiveCost:      cost,
          BillingCurrency:    r.currency,
          ChargeType:         "Usage",
          SubAccountId:       subscriptionId,
          ChargeDescription:  `${r.serviceName} usage`
        });
      }
    };

    buildRecords(current,  currentRange.start,  currentRange.end);
    buildRecords(previous, previousRange.start, previousRange.end);

    logger.info({ count: records.length }, "Azure records fetched");

    return {
      records,
      months:  [previousRange.key, currentRange.key],
      fetched: true
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "Azure adapter fetch failed");
    return { records: [], months: [], fetched: false, error: message };
  }
}

/** Quick connectivity check — verifies OAuth token can be obtained. */
export async function checkAzureConnection(): Promise<{ connected: boolean; error?: string }> {
  if (
    !process.env.AZURE_TENANT_ID ||
    !process.env.AZURE_CLIENT_ID ||
    !process.env.AZURE_CLIENT_SECRET ||
    !process.env.AZURE_SUBSCRIPTION_ID
  ) {
    return {
      connected: false,
      error: "AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET / AZURE_SUBSCRIPTION_ID not all set"
    };
  }
  try {
    await getAccessToken();
    return { connected: true };
  } catch (err) {
    return { connected: false, error: err instanceof Error ? err.message : String(err) };
  }
}
