import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Week 7 tests — detect_anomalies tool.
 *
 * All tests use sample data (no credentials needed).
 * Sample data has realistic spikes:
 *   - AWS Bedrock: Apr=$540.20 → May=$782.60 (+44.9%)   HIGH
 *   - Anthropic:   Apr=$318.90 → May=$423.80 (+32.9%)   MEDIUM
 *   - Many services appear only in May                   NEW
 */

describe("detect_anomalies — sample data", () => {
  beforeEach(() => {
    vi.stubEnv("AWS_ACCESS_KEY_ID",       "");
    vi.stubEnv("AZURE_TENANT_ID",         "");
    vi.stubEnv("GCP_SERVICE_ACCOUNT_KEY", "");
    vi.stubEnv("OPENAI_API_KEY",          "");
    vi.stubEnv("ANTHROPIC_API_KEY",       "");
  });

  it("returns anomaly object with required fields", async () => {
    const { detectAnomaliesTool } = await import("@/lib/mcp/tools/detect_anomalies");
    const result = await detectAnomaliesTool.call({});
    expect(result.isError).toBeFalsy();
    const data = JSON.parse((result.content[0] as { type: string; text: string }).text);
    expect(data).toHaveProperty("summary");
    expect(data).toHaveProperty("anomalies");
    expect(data).toHaveProperty("analysis_period");
    expect(data).toHaveProperty("total_excess_spend");
    expect(data.data_source).toBe("sample");
  });

  it("detects AWS Bedrock spike at default 30% threshold", async () => {
    const { detectAnomaliesTool } = await import("@/lib/mcp/tools/detect_anomalies");
    const result = await detectAnomaliesTool.call({ threshold_pct: 30, provider: "aws" });
    const data = JSON.parse((result.content[0] as { type: string; text: string }).text);
    const bedrockAnomaly = (data.anomalies as Array<{ service: string }>)
      .find((a) => a.service.toLowerCase().includes("bedrock"));
    expect(bedrockAnomaly).toBeDefined();
    const b = bedrockAnomaly as { severity: string; change_pct: number };
    expect(b.severity).toBe("high");
    expect(b.change_pct).toBeGreaterThan(30);
  });

  it("detects Anthropic spike at 30% threshold", async () => {
    const { detectAnomaliesTool } = await import("@/lib/mcp/tools/detect_anomalies");
    const result = await detectAnomaliesTool.call({ threshold_pct: 30, provider: "anthropic" });
    const data = JSON.parse((result.content[0] as { type: string; text: string }).text);
    expect(data.anomalies.length).toBeGreaterThan(0);
    expect((data.anomalies[0] as { change_pct: number }).change_pct).toBeGreaterThan(30);
  });

  it("returns no anomalies at 200% threshold", async () => {
    const { detectAnomaliesTool } = await import("@/lib/mcp/tools/detect_anomalies");
    const result = await detectAnomaliesTool.call({ threshold_pct: 200 });
    const data = JSON.parse((result.content[0] as { type: string; text: string }).text);
    expect(data.anomalies).toHaveLength(0);
    expect(data.summary).toMatch(/no anomalies/i);
  });

  it("returns new_services when include_new_services=true", async () => {
    const { detectAnomaliesTool } = await import("@/lib/mcp/tools/detect_anomalies");
    const result = await detectAnomaliesTool.call({ include_new_services: true, threshold_pct: 999 });
    const data = JSON.parse((result.content[0] as { type: string; text: string }).text);
    // Sample data has many services that only appear in current month
    expect(data.new_services).toBeDefined();
    expect((data.new_services as unknown[]).length).toBeGreaterThan(0);
  });

  it("does not include new_services when include_new_services=false", async () => {
    const { detectAnomaliesTool } = await import("@/lib/mcp/tools/detect_anomalies");
    const result = await detectAnomaliesTool.call({ include_new_services: false });
    const data = JSON.parse((result.content[0] as { type: string; text: string }).text);
    expect(data.new_services).toBeUndefined();
  });

  it("anomalies are ranked by dollar impact (rank 1 = biggest)", async () => {
    const { detectAnomaliesTool } = await import("@/lib/mcp/tools/detect_anomalies");
    const result = await detectAnomaliesTool.call({ threshold_pct: 1, min_change_usd: 0 });
    const data = JSON.parse((result.content[0] as { type: string; text: string }).text);
    if ((data.anomalies as unknown[]).length >= 2) {
      const [first, second] = data.anomalies as Array<{ change_usd: number }>;
      expect(first.change_usd).toBeGreaterThanOrEqual(second.change_usd);
    }
  });

  it("respects min_change_usd filter", async () => {
    const { detectAnomaliesTool } = await import("@/lib/mcp/tools/detect_anomalies");
    // Very high min_change_usd — should suppress all small spikes
    const result = await detectAnomaliesTool.call({ threshold_pct: 1, min_change_usd: 999999 });
    const data = JSON.parse((result.content[0] as { type: string; text: string }).text);
    expect(data.anomalies).toHaveLength(0);
  });

  it("total_excess_raw matches sum of anomaly change_usd values", async () => {
    const { detectAnomaliesTool } = await import("@/lib/mcp/tools/detect_anomalies");
    const result = await detectAnomaliesTool.call({});
    const data = JSON.parse((result.content[0] as { type: string; text: string }).text);
    const summed = (data.anomalies as Array<{ change_usd: number }>)
      .reduce((s, a) => s + a.change_usd, 0);
    expect(Math.round(summed * 100) / 100).toBeCloseTo(data.total_excess_raw as number, 1);
  });

  it("severity icons are present on each anomaly", async () => {
    const { detectAnomaliesTool } = await import("@/lib/mcp/tools/detect_anomalies");
    const result = await detectAnomaliesTool.call({ threshold_pct: 1, min_change_usd: 0 });
    const data = JSON.parse((result.content[0] as { type: string; text: string }).text);
    for (const a of data.anomalies as Array<{ severity_icon: string; severity: string }>) {
      expect(a.severity_icon).toBeTruthy();
      expect(["critical", "high", "medium", "low"]).toContain(a.severity);
    }
  });
});
