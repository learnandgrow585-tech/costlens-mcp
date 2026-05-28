"use client";

import { useState } from "react";
import { CostChart } from "@/app/components/CostChart";
import { CostTable } from "@/app/components/CostTable";
import type { CostBreakdownItem } from "@/lib/focus/query-engine";

type McpResult = {
  answer?: string;
  total_cost?: string;
  period?: string;
  confidence_score?: number;
  data_source?: string;
  top_services?: Array<{ service: string; cost: string; percentage: string }>;
  full_breakdown?: CostBreakdownItem[];
  note?: string;
  error?: string;
};

const QUICK_QUESTIONS = [
  "How much are we spending this month in total?",
  "What are our top 5 most expensive services?",
  "How much are we spending on AWS?",
  "Show me all AI and machine learning costs",
  "Compare this month vs last month",
  "How much are we spending on OpenAI and Anthropic?",
  "What is our Azure spend this month?",
  "Show me compute costs across all clouds"
];

export default function DashboardPage() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<McpResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [rawJson, setRawJson] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  async function callQueryCosts(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setResult(null);
    setRawJson(null);

    try {
      const res = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: { name: "query_costs", arguments: { question: q } }
        })
      });
      const json = await res.json();
      const raw = JSON.stringify(json, null, 2);
      setRawJson(raw);

      // Parse the MCP tool content
      if (json?.result?.content?.[0]?.text) {
        const parsed = JSON.parse(json.result.content[0].text) as McpResult;
        setResult(parsed);
      } else if (json?.error) {
        setResult({ error: json.error.message });
      } else {
        setResult({ error: "Unexpected response format" });
      }
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Network error" });
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    callQueryCosts(question);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">

      {/* Header */}
      <div className="mb-8">
        <div className="text-xs font-medium uppercase tracking-wider text-fg-subtle mb-2">
          MCP Playground
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          Ask about your cloud spend
        </h1>
        <p className="text-fg-muted text-sm">
          This calls{" "}
          <code className="font-mono text-accent text-xs bg-bg-subtle px-1.5 py-0.5 rounded">
            POST /api/mcp
          </code>{" "}
          with the{" "}
          <code className="font-mono text-accent text-xs bg-bg-subtle px-1.5 py-0.5 rounded">
            query_costs
          </code>{" "}
          tool — exactly what Claude Desktop / Windsurf / Cursor see.
        </p>
      </div>

      {/* Query box */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="How much are we spending on AWS this month?"
            className="flex-1 bg-bg-card border border-border rounded-lg px-4 py-3 text-fg placeholder-fg-subtle text-sm focus:outline-none focus:border-accent transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? "…" : "Ask"}
          </button>
        </div>
      </form>

      {/* Quick questions */}
      <div className="mb-8">
        <div className="text-xs text-fg-subtle mb-2">Try a question:</div>
        <div className="flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => { setQuestion(q); callQueryCosts(q); }}
              disabled={loading}
              className="text-xs px-3 py-1.5 bg-bg-card border border-border rounded-full text-fg-muted hover:text-fg hover:border-accent transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="card text-center py-12 text-fg-muted text-sm">
          Querying FOCUS data…
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">

          {/* Answer banner */}
          {result.error ? (
            <div className="card border-red-500/30 bg-red-500/5">
              <div className="text-red-400 text-sm">{result.error}</div>
            </div>
          ) : (
            <div className="card">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs text-fg-subtle mb-1">Answer</div>
                  <div className="text-fg font-medium">{result.answer}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-semibold gradient-text">
                    {result.total_cost}
                  </div>
                  <div className="text-xs text-fg-subtle mt-0.5">{result.period}</div>
                </div>
              </div>

              {/* Metadata pills */}
              <div className="flex flex-wrap gap-2 mt-4">
                {result.confidence_score !== undefined && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                    {Math.round(result.confidence_score * 100)}% confidence
                  </span>
                )}
                {result.data_source && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-bg-subtle border border-border text-fg-muted">
                    {result.data_source === "sample" ? "📊 Sample FOCUS data" : "🔴 Live data"}
                  </span>
                )}
              </div>

              {result.note && (
                <p className="text-xs text-fg-subtle mt-3 border-t border-border pt-3">
                  {result.note}
                </p>
              )}
            </div>
          )}

          {/* Chart */}
          {result.full_breakdown && result.full_breakdown.length > 0 && (
            <CostChart
              data={result.full_breakdown}
              title="Cost breakdown by service"
            />
          )}

          {/* Table */}
          {result.full_breakdown && result.full_breakdown.length > 0 && (
            <div className="card">
              <div className="text-xs font-medium uppercase tracking-wider text-fg-subtle mb-4">
                Detailed breakdown
              </div>
              <CostTable data={result.full_breakdown} />
            </div>
          )}

          {/* Raw JSON toggle */}
          <div>
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs text-fg-subtle hover:text-fg flex items-center gap-1.5 transition-colors"
            >
              <span>{showRaw ? "▼" : "▶"}</span>
              {showRaw ? "Hide" : "Show"} raw MCP JSON-RPC response
            </button>
            {showRaw && rawJson && (
              <pre className="mt-2 card font-mono text-xs text-fg-muted overflow-x-auto">
                {rawJson}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div className="card text-center py-16">
          <div className="text-4xl mb-4">💰</div>
          <div className="text-fg-muted text-sm">
            Ask a question above or click one of the quick questions to get started.
            <br />
            The response comes live from the MCP server at{" "}
            <code className="font-mono text-accent text-xs">/api/mcp</code>.
          </div>
        </div>
      )}
    </div>
  );
}
