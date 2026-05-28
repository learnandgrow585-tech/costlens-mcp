import { describe, it, expect } from "vitest";
import { handleMcpMessage } from "@/lib/mcp/server";

describe("MCP server — ping & protocol basics", () => {
  it("responds to initialize", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {}
    });
    expect(res).not.toBeNull();
    expect(res).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "costlens-mcp" }
      }
    });
  });

  it("lists the ping tool", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list"
    });
    expect(res).not.toBeNull();
    if (!res || "error" in res) throw new Error("expected success response");
    const result = res.result as { tools: Array<{ name: string }> };
    expect(result.tools.some((t) => t.name === "ping")).toBe(true);
  });

  it("calls the ping tool and returns ok=true", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "ping", arguments: {} }
    });
    expect(res).not.toBeNull();
    if (!res || "error" in res) throw new Error("expected success response");
    const result = res.result as { content: Array<{ type: string; text: string }> };
    expect(result.content[0].type).toBe("text");
    const payload = JSON.parse(result.content[0].text);
    expect(payload.ok).toBe(true);
    expect(payload.service).toBe("costlens-mcp");
    expect(typeof payload.timestamp).toBe("string");
  });

  it("returns method-not-found for unknown methods", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0",
      id: 4,
      method: "nonexistent/method"
    });
    expect(res).not.toBeNull();
    if (!res || !("error" in res)) throw new Error("expected error response");
    expect(res.error.code).toBe(-32601);
  });

  it("returns method-not-found for unknown tool names", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "does_not_exist", arguments: {} }
    });
    expect(res).not.toBeNull();
    if (!res || !("error" in res)) throw new Error("expected error response");
    expect(res.error.code).toBe(-32601);
  });

  it("ignores notifications/initialized (returns null)", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0",
      method: "notifications/initialized"
    });
    expect(res).toBeNull();
  });

  it("rejects malformed envelopes", async () => {
    const res = await handleMcpMessage({ not: "valid" });
    expect(res).not.toBeNull();
    if (!res || !("error" in res)) throw new Error("expected error response");
    expect(res.error.code).toBe(-32600);
  });
});
