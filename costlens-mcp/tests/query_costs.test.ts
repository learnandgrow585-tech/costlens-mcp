import { describe, it, expect } from "vitest";
import { handleMcpMessage } from "@/lib/mcp/server";
import { queryCosts, getCurrentMonthTotal, getLastMonthTotal, getTopServicesSummary } from "@/lib/focus/query-engine";

describe("query-engine", () => {
  it("returns total for current month", () => {
    const total = getCurrentMonthTotal();
    expect(total).toBeGreaterThan(10000);
  });

  it("returns total for last month", () => {
    const total = getLastMonthTotal();
    expect(total).toBeGreaterThan(5000);
  });

  it("top services returns sorted list", () => {
    const top = getTopServicesSummary();
    expect(top.length).toBeGreaterThan(0);
    expect(top[0].cost).toBeGreaterThanOrEqual(top[1]?.cost ?? 0);
  });

  it("query for AWS costs returns AWS records", () => {
    const result = queryCosts("How much are we spending on AWS?");
    expect(result.total).toBeGreaterThan(0);
    expect(result.confidence_score).toBeGreaterThan(0.7);
    expect(result.data_source).toBe("sample");
    expect(result.breakdown.length).toBeGreaterThan(0);
  });

  it("query for AI costs returns AI records", () => {
    const result = queryCosts("Show me AI and machine learning costs");
    expect(result.total).toBeGreaterThan(0);
    expect(result.breakdown.some((b) => b.label.includes("Bedrock") || b.label.includes("OpenAI") || b.label.includes("Anthropic"))).toBe(true);
  });

  it("compare mode returns two periods", () => {
    const result = queryCosts("Compare this month vs last month");
    expect(result.breakdown.length).toBe(2);
    expect(result.period).toContain("comparison");
  });

  it("unknown provider returns zero total gracefully", () => {
    const result = queryCosts("xyz unknown cloud provider");
    // Should not throw; may return 0 or partial match
    expect(result).toBeDefined();
    expect(typeof result.total).toBe("number");
  });
});

describe("MCP tool — query_costs", () => {
  it("calls query_costs via MCP and returns answer", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: {
        name: "query_costs",
        arguments: { question: "What are our top services this month?" }
      }
    });
    expect(res).not.toBeNull();
    if (!res || "error" in res) throw new Error("expected success");
    const result = res.result as { content: Array<{ type: string; text: string }> };
    const payload = JSON.parse(result.content[0].text);
    expect(payload.answer).toBeTruthy();
    expect(payload.total_raw).toBeGreaterThan(0);
    expect(payload.confidence_score).toBeGreaterThan(0);
  });

  it("rejects empty question", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0",
      id: 11,
      method: "tools/call",
      params: { name: "query_costs", arguments: { question: "" } }
    });
    expect(res).not.toBeNull();
    if (!res || "error" in res) throw new Error("expected success");
    const result = res.result as { content: Array<{ type: string; text: string }>; isError: boolean };
    expect(result.isError).toBe(true);
  });

  it("query_costs appears in tools/list", async () => {
    const res = await handleMcpMessage({ jsonrpc: "2.0", id: 12, method: "tools/list" });
    if (!res || "error" in res) throw new Error("expected success");
    const result = res.result as { tools: Array<{ name: string }> };
    expect(result.tools.some((t) => t.name === "query_costs")).toBe(true);
  });
});
