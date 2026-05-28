import { describe, it, expect } from "vitest";
import { handleMcpMessage } from "@/lib/mcp/server";

describe("top_services tool", () => {
  it("returns ranked list via MCP", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0", id: 20,
      method: "tools/call",
      params: { name: "top_services", arguments: { limit: 5, period: "current_month", provider: "all" } }
    });
    expect(res).not.toBeNull();
    if (!res || "error" in res) throw new Error("expected success");
    const result = res.result as { content: Array<{ text: string }> };
    const payload = JSON.parse(result.content[0].text);
    expect(payload.top_services).toHaveLength(5);
    expect(payload.top_services[0].rank).toBe(1);
    expect(payload.top_services[0].cost_formatted).toMatch(/^\$/);
    // Verify sorted descending
    expect(payload.top_services[0].cost_formatted >= payload.top_services[4].cost_formatted);
  });

  it("filters by provider aws", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0", id: 21,
      method: "tools/call",
      params: { name: "top_services", arguments: { provider: "aws" } }
    });
    if (!res || "error" in res) throw new Error("expected success");
    const result = res.result as { content: Array<{ text: string }> };
    const payload = JSON.parse(result.content[0].text);
    expect(payload.provider_filter).toBe("Amazon Web Services");
    payload.top_services.forEach((s: { provider: string }) => {
      expect(s.provider).toBe("Amazon Web Services");
    });
  });

  it("rejects invalid limit", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0", id: 22,
      method: "tools/call",
      params: { name: "top_services", arguments: { limit: 999 } }
    });
    if (!res || "error" in res) throw new Error("expected success");
    const result = res.result as { content: Array<{ text: string }>; isError: boolean };
    expect(result.isError).toBe(true);
  });
});

describe("compare_periods tool", () => {
  it("returns comparison summary", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0", id: 30,
      method: "tools/call",
      params: {
        name: "compare_periods",
        arguments: { current_period: "2026-05", previous_period: "2026-04", provider: "all" }
      }
    });
    if (!res || "error" in res) throw new Error("expected success");
    const result = res.result as { content: Array<{ text: string }> };
    const payload = JSON.parse(result.content[0].text);
    expect(payload.summary).toBeTruthy();
    expect(payload.current_period.label).toBe("May 2026");
    expect(payload.previous_period.label).toBe("April 2026");
    expect(typeof payload.delta.amount).toBe("number");
  });

  it("shows top_increases and top_decreases", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0", id: 31,
      method: "tools/call",
      params: { name: "compare_periods", arguments: {} }
    });
    if (!res || "error" in res) throw new Error("expected success");
    const result = res.result as { content: Array<{ text: string }> };
    const payload = JSON.parse(result.content[0].text);
    expect(Array.isArray(payload.top_increases)).toBe(true);
    expect(Array.isArray(payload.service_breakdown)).toBe(true);
  });

  it("all 4 tools appear in tools/list", async () => {
    const res = await handleMcpMessage({ jsonrpc: "2.0", id: 32, method: "tools/list" });
    if (!res || "error" in res) throw new Error("expected success");
    const result = res.result as { tools: Array<{ name: string }> };
    const names = result.tools.map((t) => t.name);
    expect(names).toContain("ping");
    expect(names).toContain("query_costs");
    expect(names).toContain("top_services");
    expect(names).toContain("compare_periods");
  });
});
