import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Week 6 tests — OpenAI + Anthropic adapters and ai_spend tool.
 *
 * Strategy: no real API calls — all tests exercise the
 * "no credentials → graceful fallback" path.
 * Live adapter behaviour is verified manually through the /connect page.
 */

// ── OpenAI adapter ────────────────────────────────────────────────────────

describe("OpenAI adapter — no credentials", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "");
  });

  it("fetchOpenAiRecords returns fetched=false when key missing", async () => {
    const { fetchOpenAiRecords } = await import("@/lib/focus/adapters/openai-usage");
    const result = await fetchOpenAiRecords();
    expect(result.fetched).toBe(false);
    expect(result.records).toHaveLength(0);
    expect(result.error).toMatch(/OPENAI_API_KEY/i);
  });

  it("checkOpenAiConnection returns connected=false when key missing", async () => {
    const { checkOpenAiConnection } = await import("@/lib/focus/adapters/openai-usage");
    const result = await checkOpenAiConnection();
    expect(result.connected).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// ── Anthropic adapter ─────────────────────────────────────────────────────

describe("Anthropic adapter — no credentials", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
  });

  it("fetchAnthropicRecords returns fetched=false when key missing", async () => {
    const { fetchAnthropicRecords } = await import("@/lib/focus/adapters/anthropic-usage");
    const result = await fetchAnthropicRecords();
    expect(result.fetched).toBe(false);
    expect(result.records).toHaveLength(0);
    expect(result.error).toMatch(/ANTHROPIC_API_KEY/i);
  });

  it("checkAnthropicConnection returns connected=false when key missing", async () => {
    const { checkAnthropicConnection } = await import("@/lib/focus/adapters/anthropic-usage");
    const result = await checkAnthropicConnection();
    expect(result.connected).toBe(false);
  });
});

describe("Anthropic adapter — billing not available", () => {
  beforeEach(() => {
    // Valid-looking key but billing API not public
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-fake");
  });

  it("fetchAnthropicRecords always returns fetched=false (billing API not public)", async () => {
    const { fetchAnthropicRecords } = await import("@/lib/focus/adapters/anthropic-usage");
    const result = await fetchAnthropicRecords();
    // Even with a key present, fetched should be false because billing API
    // isn't available — we rely on sample data for Anthropic costs
    expect(result.fetched).toBe(false);
    expect(result.records).toHaveLength(0);
    expect(result.note).toBeTruthy();
  });
});

// ── ai_spend tool ─────────────────────────────────────────────────────────

describe("ai_spend tool — sample data", () => {
  beforeEach(() => {
    vi.stubEnv("AWS_ACCESS_KEY_ID",       "");
    vi.stubEnv("AZURE_TENANT_ID",         "");
    vi.stubEnv("GCP_SERVICE_ACCOUNT_KEY", "");
    vi.stubEnv("OPENAI_API_KEY",          "");
    vi.stubEnv("ANTHROPIC_API_KEY",       "");
  });

  it("returns AI spend breakdown from sample data", async () => {
    const { aiSpendTool } = await import("@/lib/mcp/tools/ai_spend");
    const result = await aiSpendTool.call({ period: "current_month", group_by: "provider" });
    expect(result.isError).toBeFalsy();
    const data = JSON.parse((result.content[0] as { type: string; text: string }).text);
    expect(data.total_ai_spend).toBeDefined();
    expect(data.by_provider).toBeDefined();
    expect(Array.isArray(data.by_provider)).toBe(true);
    // Sample data has OpenAI, Anthropic, AWS Bedrock, Azure OpenAI, GCP Vertex AI
    expect(data.by_provider.length).toBeGreaterThan(0);
    expect(data.data_source).toBe("sample");
  });

  it("returns month-over-month trend when period=both", async () => {
    const { aiSpendTool } = await import("@/lib/mcp/tools/ai_spend");
    const result = await aiSpendTool.call({ period: "both", group_by: "both" });
    const data = JSON.parse((result.content[0] as { type: string; text: string }).text);
    expect(data.month_over_month).toBeDefined();
    expect(data.month_over_month.direction).toMatch(/increase|decrease|flat/);
    expect(data.by_provider).toBeDefined();
    expect(data.by_service).toBeDefined();
  });

  it("ai_pct_of_total is a valid percentage string", async () => {
    const { aiSpendTool } = await import("@/lib/mcp/tools/ai_spend");
    const result = await aiSpendTool.call({});
    const data = JSON.parse((result.content[0] as { type: string; text: string }).text);
    expect(data.ai_pct_of_total).toMatch(/\d+(\.\d+)?%/);
  });
});

// ── Store — 5-provider status ─────────────────────────────────────────────

describe("Store — getConnectionStatus includes OpenAI + Anthropic", () => {
  beforeEach(() => {
    vi.stubEnv("AWS_ACCESS_KEY_ID",       "");
    vi.stubEnv("AZURE_TENANT_ID",         "");
    vi.stubEnv("GCP_SERVICE_ACCOUNT_KEY", "");
    vi.stubEnv("OPENAI_API_KEY",          "");
    vi.stubEnv("ANTHROPIC_API_KEY",       "");
  });

  it("reports all 5 providers with connected=false when no keys set", async () => {
    const { getConnectionStatus } = await import("@/lib/focus/store");
    const status = await getConnectionStatus();
    expect(status).toHaveProperty("aws");
    expect(status).toHaveProperty("azure");
    expect(status).toHaveProperty("gcp");
    expect(status).toHaveProperty("openai");
    expect(status).toHaveProperty("anthropic");
    expect(status.openai.connected).toBe(false);
    expect(status.anthropic.connected).toBe(false);
  });
});
