import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Azure + GCP adapter tests.
 * We never make real API calls in tests — adapters are tested via the
 * "no credentials → graceful fallback" path. Live adapter behavior is
 * verified manually through the /connect page and dashboard.
 */

describe("Azure adapter — no credentials", () => {
  beforeEach(() => {
    vi.stubEnv("AZURE_TENANT_ID",        "");
    vi.stubEnv("AZURE_CLIENT_ID",        "");
    vi.stubEnv("AZURE_CLIENT_SECRET",    "");
    vi.stubEnv("AZURE_SUBSCRIPTION_ID",  "");
  });

  it("fetchAzureRecords returns fetched=false when credentials missing", async () => {
    const { fetchAzureRecords } = await import("@/lib/focus/adapters/azure");
    const result = await fetchAzureRecords();
    expect(result.fetched).toBe(false);
    expect(result.records).toHaveLength(0);
    expect(result.error).toMatch(/credentials/i);
  });

  it("checkAzureConnection returns connected=false", async () => {
    const { checkAzureConnection } = await import("@/lib/focus/adapters/azure");
    const result = await checkAzureConnection();
    expect(result.connected).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("GCP adapter — no credentials", () => {
  beforeEach(() => {
    vi.stubEnv("GCP_SERVICE_ACCOUNT_KEY",    "");
    vi.stubEnv("GCP_BILLING_BIGQUERY_TABLE", "");
  });

  it("fetchGcpRecords returns fetched=false when credentials missing", async () => {
    const { fetchGcpRecords } = await import("@/lib/focus/adapters/gcp");
    const result = await fetchGcpRecords();
    expect(result.fetched).toBe(false);
    expect(result.records).toHaveLength(0);
    expect(result.error).toBeTruthy();
  });

  it("checkGcpConnection returns connected=false when no key", async () => {
    const { checkGcpConnection } = await import("@/lib/focus/adapters/gcp");
    const result = await checkGcpConnection();
    expect(result.connected).toBe(false);
  });

  it("checkGcpConnection returns connected=false when no table", async () => {
    vi.stubEnv("GCP_SERVICE_ACCOUNT_KEY", "{}");
    vi.stubEnv("GCP_BILLING_BIGQUERY_TABLE", "");
    const { checkGcpConnection } = await import("@/lib/focus/adapters/gcp");
    const result = await checkGcpConnection();
    expect(result.connected).toBe(false);
    expect(result.error).toMatch(/BILLING_BIGQUERY_TABLE/i);
  });
});

describe("Store — multi-provider fallback", () => {
  it("falls back to sample data when no providers configured", async () => {
    vi.stubEnv("AWS_ACCESS_KEY_ID",       "");
    vi.stubEnv("AZURE_TENANT_ID",         "");
    vi.stubEnv("GCP_SERVICE_ACCOUNT_KEY", "");

    const { getRecords } = await import("@/lib/focus/store");
    const result = await getRecords();
    expect(result.source).toBe("sample");
    expect(result.records.length).toBeGreaterThan(0);
    expect(result.providers).toHaveLength(0);
  });

  it("getConnectionStatus reports all 5 providers", async () => {
    vi.stubEnv("AWS_ACCESS_KEY_ID",       "");
    vi.stubEnv("AZURE_TENANT_ID",         "");
    vi.stubEnv("GCP_SERVICE_ACCOUNT_KEY", "");

    const { getConnectionStatus } = await import("@/lib/focus/store");
    const status = await getConnectionStatus();
    expect(status).toHaveProperty("aws");
    expect(status).toHaveProperty("azure");
    expect(status).toHaveProperty("gcp");
    expect(status).toHaveProperty("openai");
    expect(status).toHaveProperty("anthropic");
    expect(status.aws.connected).toBe(false);
    expect(status.azure.connected).toBe(false);
    expect(status.gcp.connected).toBe(false);
  });
});
