"use client";

import { useState } from "react";

type ToolResult = {
  ok?: boolean;
  error?: string;
  data?: unknown;
};

export default function DashboardPage() {
  const [result, setResult] = useState<ToolResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function callPing() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "ping", arguments: {} }
        })
      });
      const json = await res.json();
      setResult({ ok: true, data: json });
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "unknown error" });
    } finally {
      setLoading(false);
    }
  }

  async function listTools() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list"
        })
      });
      const json = await res.json();
      setResult({ ok: true, data: json });
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "unknown error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="mb-10">
        <div className="text-xs font-medium uppercase tracking-wider text-fg-subtle mb-2">
          Playground
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">MCP server playground</h1>
        <p className="text-fg-muted">
          A direct interface to the <code className="text-accent font-mono text-sm">/api/mcp</code>{" "}
          endpoint. This is what Claude Desktop / Windsurf / Cursor / Codex see when they connect.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <button
          onClick={callPing}
          disabled={loading}
          className="card text-left hover:border-accent disabled:opacity-50"
        >
          <div className="text-accent text-xs font-medium uppercase tracking-wider mb-2">
            Call tool
          </div>
          <div className="font-mono text-sm mb-1">ping</div>
          <div className="text-xs text-fg-muted">Health check — verifies the server responds.</div>
        </button>

        <button
          onClick={listTools}
          disabled={loading}
          className="card text-left hover:border-accent disabled:opacity-50"
        >
          <div className="text-accent text-xs font-medium uppercase tracking-wider mb-2">
            Discover
          </div>
          <div className="font-mono text-sm mb-1">tools/list</div>
          <div className="text-xs text-fg-muted">Lists every tool the server exposes.</div>
        </button>

        <div className="card opacity-60">
          <div className="text-fg-subtle text-xs font-medium uppercase tracking-wider mb-2">
            Coming week 2
          </div>
          <div className="font-mono text-sm mb-1">query_costs</div>
          <div className="text-xs text-fg-muted">Natural-language cost queries over FOCUS data.</div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
            Response
          </div>
          {loading && <div className="text-xs text-accent">calling…</div>}
        </div>
        <pre className="font-mono text-xs leading-relaxed overflow-x-auto text-fg-muted">
          {result
            ? JSON.stringify(result.data ?? { error: result.error }, null, 2)
            : "// Click a tool above to send a JSON-RPC request to /api/mcp"}
        </pre>
      </div>

      <div className="mt-10 text-sm text-fg-subtle">
        Week 1 ships <code className="font-mono">ping</code> and{" "}
        <code className="font-mono">tools/list</code>. Cost queries, charts, and adapters land in
        weeks 2–6.
      </div>
    </div>
  );
}
