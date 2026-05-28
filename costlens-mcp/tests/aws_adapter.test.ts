import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * AWS adapter tests.
 * The adapter is tested in two modes:
 *   1. No credentials set  → returns empty records + error message
 *   2. With credentials    → (mocked) returns FOCUS records
 *
 * We don't make real AWS API calls in tests — that would cost money and
 * require secrets in CI. The real adapter is verified manually via /connect.
 */

describe("AWS adapter — no credentials", () => {
  beforeEach(() => {
    vi.stubEnv("AWS_ACCESS_KEY_ID",     "");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "");
  });

  it("fetchAwsRecords returns fetched=false when no credentials", async () => {
    const { fetchAwsRecords } = await import("@/lib/focus/adapters/aws");
    const result = await fetchAwsRecords();
    expect(result.fetched).toBe(false);
    expect(result.records).toHaveLength(0);
    expect(result.error).toMatch(/credentials/i);
  });

  it("checkAwsConnection returns connected=false when no credentials", async () => {
    const { checkAwsConnection } = await import("@/lib/focus/adapters/aws");
    const result = await checkAwsConnection();
    expect(result.connected).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("Data store — fallback to sample", () => {
  beforeEach(() => {
    vi.stubEnv("AWS_ACCESS_KEY_ID",     "");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "");
  });

  it("getRecords returns sample data when no provider credentials set", async () => {
    const { getRecords } = await import("@/lib/focus/store");
    const result = await getRecords();
    expect(result.source).toBe("sample");
    expect(result.records.length).toBeGreaterThan(0);
    expect(result.providers).toHaveLength(0);
  });
});

describe("query_costs tool uses store", () => {
  it("returns data_source from the store (sample when no creds)", async () => {
    vi.stubEnv("AWS_ACCESS_KEY_ID",     "");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "");

    const { handleMcpMessage } = await import("@/lib/mcp/server");
    const res = await handleMcpMessage({
      jsonrpc: "2.0", id: 40,
      method: "tools/call",
      params: { name: "query_costs", arguments: { question: "What is our total spend?" } }
    });
    expect(res).not.toBeNull();
    if (!res || "error" in res) throw new Error("expected success");
    const result = res.result as { content: Array<{ text: string }> };
    const payload = JSON.parse(result.content[0].text);
    expect(payload.data_source).toBe("sample");
    expect(payload.total_raw).toBeGreaterThan(0);
  });
});
