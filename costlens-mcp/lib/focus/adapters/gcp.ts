/**
 * Google Cloud → FOCUS 1.2 adapter via BigQuery billing export.
 *
 * Requires env vars:
 *   GCP_SERVICE_ACCOUNT_KEY    — JSON service account key (paste full JSON
 *                                content as the value in Vercel)
 *   GCP_BILLING_BIGQUERY_TABLE — fully-qualified table name:
 *                                "project-id.dataset.gcp_billing_export_v1_XXXXXX"
 *
 * Permissions needed on the service account:
 *   - roles/bigquery.dataViewer  (on the billing dataset)
 *   - roles/bigquery.jobUser     (on the project)
 *
 * Setup notes:
 *   1. Enable billing export to BigQuery in GCP console:
 *      Billing → Billing export → BigQuery export
 *   2. Allow ~24h after enabling for data to populate.
 *
 * Cost: BigQuery charges $5/TB of data scanned. Monthly billing data is
 * typically <100MB, so each query costs fractions of a cent.
 *
 * Uses Node.js built-in crypto for JWT signing — no extra dependencies.
 */

import crypto from "node:crypto";
import type { FocusRecord, ServiceCategory } from "@/lib/focus/schema";
import { logger } from "@/lib/utils/logger";

// ── GCP service name → FOCUS ServiceCategory mapping ─────────────────────

const SERVICE_CATEGORY_MAP: Record<string, ServiceCategory> = {
  "Compute Engine":               "Compute",
  "Cloud Run":                    "Compute",
  "Cloud Functions":              "Compute",
  "Kubernetes Engine":            "Compute",
  "App Engine":                   "Compute",
  "Cloud Storage":                "Storage",
  "Persistent Disk":              "Storage",
  "Filestore":                    "Storage",
  "Cloud SQL":                    "Databases",
  "BigQuery":                     "Databases",
  "Cloud Spanner":                "Databases",
  "Cloud Bigtable":               "Databases",
  "Firestore":                    "Databases",
  "Memorystore":                  "Databases",
  "Vertex AI":                    "AI and Machine Learning",
  "AI Platform":                  "AI and Machine Learning",
  "Natural Language API":         "AI and Machine Learning",
  "Vision API":                   "AI and Machine Learning",
  "Speech-to-Text":               "AI and Machine Learning",
  "Translation API":              "AI and Machine Learning",
  "Networking":                   "Networking",
  "Cloud CDN":                    "Networking",
  "Cloud Load Balancing":         "Networking",
  "Cloud DNS":                    "Networking",
  "Cloud VPN":                    "Networking",
  "Cloud KMS":                    "Security",
  "Secret Manager":               "Security",
  "Identity-Aware Proxy":         "Security",
  "Cloud Logging":                "Management",
  "Cloud Monitoring":             "Management",
  "Cloud Trace":                  "Management",
  "Pub/Sub":                      "Developer Tools",
  "Cloud Build":                  "Developer Tools"
};

function getCategory(serviceName: string): ServiceCategory {
  if (SERVICE_CATEGORY_MAP[serviceName]) return SERVICE_CATEGORY_MAP[serviceName];
  const lower = serviceName.toLowerCase();
  for (const [key, cat] of Object.entries(SERVICE_CATEGORY_MAP)) {
    if (lower.includes(key.toLowerCase())) return cat;
  }
  return "Other";
}

// ── Service account JSON parsing ─────────────────────────────────────────

interface ServiceAccountKey {
  client_email: string;
  private_key:  string;
  project_id:   string;
  token_uri?:   string;
}

function parseServiceAccount(): ServiceAccountKey {
  const raw = process.env.GCP_SERVICE_ACCOUNT_KEY!;
  // Accept either raw JSON or base64-encoded JSON for convenience
  let jsonText = raw.trim();
  if (!jsonText.startsWith("{")) {
    try {
      jsonText = Buffer.from(raw, "base64").toString("utf-8");
    } catch {
      throw new Error("GCP_SERVICE_ACCOUNT_KEY is neither JSON nor base64-encoded JSON");
    }
  }
  const parsed = JSON.parse(jsonText) as ServiceAccountKey;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("GCP_SERVICE_ACCOUNT_KEY missing client_email or private_key");
  }
  // Vercel env vars sometimes have escaped newlines in the private key
  parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  return parsed;
}

// ── JWT signing (RS256, Node.js built-in crypto) ─────────────────────────

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createJwt(sa: ServiceAccountKey, scope: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header  = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss:   sa.client_email,
    scope,
    aud:   sa.token_uri ?? "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600
  }));
  const unsigned = `${header}.${payload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64url(signer.sign(sa.private_key));
  return `${unsigned}.${signature}`;
}

// ── Exchange JWT for access token ────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<{ token: string; projectId: string }> {
  const sa = parseServiceAccount();

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return { token: cachedToken.token, projectId: sa.project_id };
  }

  const jwt = createJwt(sa, "https://www.googleapis.com/auth/bigquery.readonly");

  const response = await fetch(sa.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GCP token exchange failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 600) * 1000
  };
  return { token: data.access_token, projectId: sa.project_id };
}

// ── BigQuery synchronous query ───────────────────────────────────────────

interface BigQueryQueryResponse {
  schema?: { fields: Array<{ name: string; type: string }> };
  rows?:   Array<{ f: Array<{ v: string | null }> }>;
  jobComplete?: boolean;
  errors?: Array<{ message: string }>;
}

interface GcpCostRow {
  serviceName:  string;
  cost:         number;
  currency:     string;
  billingMonth: string;
}

function buildQuery(table: string, startDate: string, endDate: string): string {
  // Escape backticks defensively, then quote with backticks
  const safeTable = table.replace(/`/g, "");
  return `
    SELECT
      service.description AS service_name,
      SUM(cost)           AS billed_cost,
      currency            AS billing_currency,
      FORMAT_DATE('%Y-%m', DATE(usage_start_time)) AS billing_month
    FROM \`${safeTable}\`
    WHERE DATE(usage_start_time) >= '${startDate}'
      AND DATE(usage_start_time) <= '${endDate}'
      AND cost > 0
    GROUP BY service_name, billing_currency, billing_month
    ORDER BY billed_cost DESC
    LIMIT 200
  `.trim();
}

async function runQuery(
  projectId: string,
  query: string,
  token: string
): Promise<GcpCostRow[]> {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json"
    },
    body: JSON.stringify({
      query,
      useLegacySql: false,
      timeoutMs:    25000
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`BigQuery query failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const json = await response.json() as BigQueryQueryResponse;
  if (json.errors && json.errors.length > 0) {
    throw new Error(`BigQuery errors: ${json.errors.map((e) => e.message).join("; ")}`);
  }

  const rows = json.rows ?? [];
  return rows.map((row) => {
    const [service, cost, currency, month] = row.f.map((c) => c.v);
    return {
      serviceName:  service ?? "Unknown",
      cost:         Number(cost ?? 0),
      currency:     currency ?? "USD",
      billingMonth: month ?? ""
    };
  });
}

// ── Date helpers ─────────────────────────────────────────────────────────

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

// ── Public API ───────────────────────────────────────────────────────────

export interface GcpAdapterResult {
  records:  FocusRecord[];
  months:   string[];
  fetched:  boolean;
  error?:   string;
}

export async function fetchGcpRecords(): Promise<GcpAdapterResult> {
  if (!process.env.GCP_SERVICE_ACCOUNT_KEY || !process.env.GCP_BILLING_BIGQUERY_TABLE) {
    return {
      records: [],
      months:  [],
      fetched: false,
      error:   "GCP_SERVICE_ACCOUNT_KEY or GCP_BILLING_BIGQUERY_TABLE not set"
    };
  }

  try {
    const { token, projectId } = await getAccessToken();
    const table = process.env.GCP_BILLING_BIGQUERY_TABLE!;

    const currentRange  = monthRange(0);
    const previousRange = monthRange(-1);
    const fullStart = previousRange.start;
    const fullEnd   = currentRange.end;

    logger.info({ projectId, table, fullStart, fullEnd }, "querying GCP billing export");

    const query = buildQuery(table, fullStart, fullEnd);
    const rows  = await runQuery(projectId, query, token);

    const records: FocusRecord[] = rows.map((r) => {
      // Reconstruct the start/end of the billing month for FOCUS records
      const [year, month] = r.billingMonth.split("-").map(Number);
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd   = new Date(year, month, 0);
      const cost = Math.round(r.cost * 100) / 100;

      return {
        ProviderName:       "Google Cloud",
        ServiceName:        r.serviceName,
        ServiceCategory:    getCategory(r.serviceName),
        BillingPeriodStart: `${toYYYYMMDD(periodStart)}T00:00:00Z`,
        BillingPeriodEnd:   `${toYYYYMMDD(periodEnd)}T23:59:59Z`,
        BilledCost:         cost,
        EffectiveCost:      cost,
        BillingCurrency:    r.currency,
        ChargeType:         "Usage",
        ChargeDescription:  `${r.serviceName} usage`
      };
    });

    logger.info({ count: records.length }, "GCP records fetched");

    return {
      records,
      months:  [previousRange.key, currentRange.key],
      fetched: true
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "GCP adapter fetch failed");
    return { records: [], months: [], fetched: false, error: message };
  }
}

export async function checkGcpConnection(): Promise<{ connected: boolean; error?: string }> {
  if (!process.env.GCP_SERVICE_ACCOUNT_KEY) {
    return { connected: false, error: "GCP_SERVICE_ACCOUNT_KEY not set" };
  }
  if (!process.env.GCP_BILLING_BIGQUERY_TABLE) {
    return { connected: false, error: "GCP_BILLING_BIGQUERY_TABLE not set" };
  }
  try {
    await getAccessToken();
    return { connected: true };
  } catch (err) {
    return { connected: false, error: err instanceof Error ? err.message : String(err) };
  }
}
