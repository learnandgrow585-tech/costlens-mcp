"use client";

import { useState } from "react";
import { ProviderCards }    from "@/app/components/ProviderCards";
import { CostChart }        from "@/app/components/CostChart";
import { CostTable }        from "@/app/components/CostTable";
import { ComparisonChart }  from "@/app/components/ComparisonChart";
import type { CostBreakdownItem } from "@/lib/focus/query-engine";

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = "ask" | "top_services" | "compare";

type QueryResult = {
  answer?: string;
  total_cost?: string;
  total_raw?: number;
  period?: string;
  confidence_score?: number;
  data_source?: string;
  full_breakdown?: CostBreakdownItem[];
  note?: string;
  error?: string;
};

type TopServicesResult = {
  period?: string;
  provider_filter?: string;
  total_spend?: string;
  top_services?: Array<{
    rank: number;
    service: string;
    provider: string;
    category: string;
    cost_formatted: string;
    percentage_of_total: number;
  }>;
  error?: string;
  note?: string;
};

type ServiceDiff = {
  service: string;
  current_cost: number;
  previous_cost: number;
  delta: number;
  delta_percent: number;
};

type CompareResult = {
  summary?: string;
  current_period?:  { label: string; formatted: string };
  previous_period?: { label: string; formatted: string };
  delta?: { formatted: string; percent: number; trend: string };
  top_increases?: Array<{ service: string; change: string }>;
  top_decreases?: Array<{ service: string; change: string }>;
  service_breakdown?: ServiceDiff[];
  error?: string;
  note?: string;
};

// ── Quick questions ────────────────────────────────────────────────────────

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

// ── Main component ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("ask");

  // Tab: Ask
  const [question, setQuestion]   = useState("");
  const [askResult, setAskResult] = useState<QueryResult | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [rawJson, setRawJson]     = useState<string | null>(null);
  const [showRaw, setShowRaw]     = useState(false);

  // Tab: Top services
  const [topLimit, setTopLimit]     = useState(8);
  const [topProvider, setTopProvider] = useState("all");
  const [topPeriod, setTopPeriod]   = useState("current_month");
  const [topResult, setTopResult]   = useState<TopServicesResult | null>(null);
  const [topLoading, setTopLoading] = useState(false);

  // Tab: Compare
  const [cmpProvider, setCmpProvider] = useState("all");
  const [cmpResult, setCmpResult]     = useState<CompareResult | null>(null);
  const [cmpLoading, setCmpLoading]   = useState(false);

  // ── MCP caller ─────────────────────────────────────────────────────────

  async function callMcp(tool: string, args: Record<string, unknown>) {
    const res = await fetch("/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: tool, arguments: args }
      })
    });
    const json = await res.json();
    const text = json?.result?.content?.[0]?.text;
    if (!text) throw new Error(json?.error?.message ?? "Unexpected response");
    return { parsed: JSON.parse(text) as Record<string, unknown>, raw: JSON.stringify(json, null, 2) };
  }

  // ── Ask tab ────────────────────────────────────────────────────────────

  async function handleAsk(q: string) {
    if (!q.trim()) return;
    setAskLoading(true); setAskResult(null); setRawJson(null);
    try {
      const { parsed, raw } = await callMcp("query_costs", { question: q });
      setAskResult(parsed as QueryResult);
      setRawJson(raw);
    } catch (e) {
      setAskResult({ error: e instanceof Error ? e.message : "Error" });
    } finally { setAskLoading(false); }
  }

  // ── Top services tab ───────────────────────────────────────────────────

  async function handleTopServices() {
    setTopLoading(true); setTopResult(null);
    try {
      const { parsed } = await callMcp("top_services", {
        limit: topLimit,
        period: topPeriod,
        provider: topProvider
      });
      setTopResult(parsed as TopServicesResult);
    } catch (e) {
      setTopResult({ error: e instanceof Error ? e.message : "Error" });
    } finally { setTopLoading(false); }
  }

  // ── Compare tab ────────────────────────────────────────────────────────

  async function handleCompare() {
    setCmpLoading(true); setCmpResult(null);
    try {
      const { parsed } = await callMcp("compare_periods", {
        current_period: "2026-05",
        previous_period: "2026-04",
        provider: cmpProvider
      });
      setCmpResult(parsed as CompareResult);
    } catch (e) {
      setCmpResult({ error: e instanceof Error ? e.message : "Error" });
    } finally { setCmpLoading(false); }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-6">
        <div className="text-xs font-medium uppercase tracking-wider text-fg-subtle mb-1">
          MCP Playground
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Cloud + AI cost explorer
        </h1>
      </div>

      {/* Provider summary cards */}
      <ProviderCards />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {([
          ["ask",         "💬 Ask a question",    "query_costs"],
          ["top_services","📊 Top services",       "top_services"],
          ["compare",     "📈 Month vs month",     "compare_periods"]
        ] as const).map(([id, label, badge]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === id
                ? "border-accent text-fg"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            {label}
            <span className="ml-2 text-xs font-mono text-accent opacity-70">{badge}</span>
          </button>
        ))}
      </div>

      {/* ── Tab: Ask ───────────────────────────────────────────────────── */}
      {activeTab === "ask" && (
        <div>
          <form onSubmit={(e) => { e.preventDefault(); handleAsk(question); }} className="mb-5">
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
                disabled={askLoading || !question.trim()}
                className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {askLoading ? "…" : "Ask"}
              </button>
            </div>
          </form>

          <div className="flex flex-wrap gap-2 mb-8">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => { setQuestion(q); handleAsk(q); }}
                disabled={askLoading}
                className="text-xs px-3 py-1.5 bg-bg-card border border-border rounded-full text-fg-muted hover:text-fg hover:border-accent transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          {askLoading && (
            <div className="card text-center py-10 text-fg-muted text-sm">
              Querying FOCUS data…
            </div>
          )}

          {askResult && !askLoading && (
            <div className="space-y-4">
              {askResult.error ? (
                <div className="card border-red-500/30 bg-red-500/5">
                  <div className="text-red-400 text-sm">{askResult.error}</div>
                </div>
              ) : (
                <>
                  <div className="card">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="text-xs text-fg-subtle mb-1">Answer</div>
                        <div className="text-fg font-medium">{askResult.answer}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-semibold gradient-text">{askResult.total_cost}</div>
                        <div className="text-xs text-fg-subtle mt-0.5">{askResult.period}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {askResult.confidence_score !== undefined && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                          {Math.round(askResult.confidence_score * 100)}% confidence
                        </span>
                      )}
                      <span className="text-xs px-2.5 py-1 rounded-full bg-bg-subtle border border-border text-fg-muted">
                        📊 Sample FOCUS data
                      </span>
                    </div>
                    {askResult.note && (
                      <p className="text-xs text-fg-subtle mt-3 pt-3 border-t border-border">
                        {askResult.note}
                      </p>
                    )}
                  </div>

                  {askResult.full_breakdown && askResult.full_breakdown.length > 0 && (
                    <CostChart data={askResult.full_breakdown} title="Cost breakdown by service" />
                  )}

                  {askResult.full_breakdown && askResult.full_breakdown.length > 0 && (
                    <div className="card">
                      <div className="text-xs font-medium uppercase tracking-wider text-fg-subtle mb-4">
                        Detailed breakdown
                      </div>
                      <CostTable data={askResult.full_breakdown} />
                    </div>
                  )}

                  <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="text-xs text-fg-subtle hover:text-fg flex items-center gap-1.5"
                  >
                    <span>{showRaw ? "▼" : "▶"}</span>
                    {showRaw ? "Hide" : "Show"} raw MCP JSON-RPC response
                  </button>
                  {showRaw && rawJson && (
                    <pre className="card font-mono text-xs text-fg-muted overflow-x-auto">{rawJson}</pre>
                  )}
                </>
              )}
            </div>
          )}

          {!askResult && !askLoading && (
            <div className="card text-center py-16">
              <div className="text-4xl mb-4">💰</div>
              <div className="text-fg-muted text-sm">
                Type a question or click a quick question above.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Top services ──────────────────────────────────────────── */}
      {activeTab === "top_services" && (
        <div>
          <div className="flex flex-wrap items-end gap-3 mb-6">
            <div>
              <label className="text-xs text-fg-subtle block mb-1">Provider</label>
              <select
                value={topProvider}
                onChange={(e) => setTopProvider(e.target.value)}
                className="bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:border-accent"
              >
                <option value="all">All providers</option>
                <option value="aws">AWS</option>
                <option value="azure">Azure</option>
                <option value="gcp">GCP</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-fg-subtle block mb-1">Period</label>
              <select
                value={topPeriod}
                onChange={(e) => setTopPeriod(e.target.value)}
                className="bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:border-accent"
              >
                <option value="current_month">This month (May 2026)</option>
                <option value="last_month">Last month (April 2026)</option>
                <option value="all">All time</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-fg-subtle block mb-1">Show top</label>
              <select
                value={topLimit}
                onChange={(e) => setTopLimit(Number(e.target.value))}
                className="bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:border-accent"
              >
                {[5, 8, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>{n} services</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleTopServices}
              disabled={topLoading}
              className="btn-primary disabled:opacity-50"
            >
              {topLoading ? "…" : "Run →"}
            </button>
          </div>

          {topLoading && (
            <div className="card text-center py-10 text-fg-muted text-sm">Fetching…</div>
          )}

          {topResult && !topLoading && (
            <div className="space-y-4">
              {topResult.error ? (
                <div className="card border-red-500/30 bg-red-500/5 text-red-400 text-sm">
                  {topResult.error}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between card">
                    <div>
                      <div className="text-xs text-fg-subtle">
                        {topResult.provider_filter} · {topResult.period}
                      </div>
                      <div className="text-2xl font-semibold gradient-text mt-0.5">
                        {topResult.total_spend}
                      </div>
                    </div>
                    <div className="text-xs px-2.5 py-1 rounded-full bg-bg-subtle border border-border text-fg-muted">
                      📊 Sample FOCUS data
                    </div>
                  </div>

                  {topResult.top_services && (
                    <div className="card">
                      <div className="text-xs font-medium uppercase tracking-wider text-fg-subtle mb-4">
                        Top {topResult.top_services.length} services by cost
                      </div>
                      <div className="space-y-3">
                        {topResult.top_services.map((s) => (
                          <div key={s.service} className="flex items-center gap-3">
                            <span className="text-xs text-fg-subtle w-5 text-right shrink-0">
                              {s.rank}.
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-fg truncate">{s.service}</div>
                              <div className="text-xs text-fg-subtle">{s.provider} · {s.category}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-mono text-fg">{s.cost_formatted}</div>
                              <div className="text-xs text-fg-subtle">{s.percentage_of_total}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!topResult && !topLoading && (
            <div className="card text-center py-16">
              <div className="text-4xl mb-4">📊</div>
              <div className="text-fg-muted text-sm">Choose filters above and click Run.</div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Compare ───────────────────────────────────────────────── */}
      {activeTab === "compare" && (
        <div>
          <div className="flex flex-wrap items-end gap-3 mb-6">
            <div>
              <label className="text-xs text-fg-subtle block mb-1">Provider</label>
              <select
                value={cmpProvider}
                onChange={(e) => setCmpProvider(e.target.value)}
                className="bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:border-accent"
              >
                <option value="all">All providers</option>
                <option value="aws">AWS</option>
                <option value="azure">Azure</option>
                <option value="gcp">GCP</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <div className="text-sm text-fg-muted self-end pb-2">
              Comparing <span className="text-fg">May 2026</span> vs{" "}
              <span className="text-fg">April 2026</span>
            </div>
            <button
              onClick={handleCompare}
              disabled={cmpLoading}
              className="btn-primary disabled:opacity-50"
            >
              {cmpLoading ? "…" : "Compare →"}
            </button>
          </div>

          {cmpLoading && (
            <div className="card text-center py-10 text-fg-muted text-sm">Comparing…</div>
          )}

          {cmpResult && !cmpLoading && (
            <div className="space-y-4">
              {cmpResult.error ? (
                <div className="card border-red-500/30 bg-red-500/5 text-red-400 text-sm">
                  {cmpResult.error}
                </div>
              ) : (
                <>
                  {/* Summary card */}
                  <div className="card">
                    <div className="text-fg font-medium mb-3">{cmpResult.summary}</div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-fg-subtle mb-0.5">
                          {cmpResult.previous_period?.label}
                        </div>
                        <div className="text-xl font-semibold text-fg">
                          {cmpResult.previous_period?.formatted}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-fg-subtle mb-0.5">Change</div>
                        <div className={`text-xl font-semibold ${
                          (cmpResult.delta?.percent ?? 0) > 0 ? "text-red-400" : "text-green-400"
                        }`}>
                          {cmpResult.delta?.formatted}
                        </div>
                        <div className="text-xs text-fg-subtle">
                          {Math.abs(cmpResult.delta?.percent ?? 0)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-fg-subtle mb-0.5">
                          {cmpResult.current_period?.label}
                        </div>
                        <div className="text-xl font-semibold gradient-text">
                          {cmpResult.current_period?.formatted}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Biggest movers */}
                  {cmpResult.top_increases && cmpResult.top_increases.length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="card">
                        <div className="text-xs font-medium uppercase tracking-wider text-red-400/70 mb-3">
                          Biggest increases
                        </div>
                        <div className="space-y-2">
                          {cmpResult.top_increases.map((s) => (
                            <div key={s.service} className="flex justify-between text-sm">
                              <span className="text-fg-muted truncate mr-2">{s.service}</span>
                              <span className="text-red-400 shrink-0 font-mono text-xs">
                                {s.change}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {cmpResult.top_decreases && cmpResult.top_decreases.length > 0 && (
                        <div className="card">
                          <div className="text-xs font-medium uppercase tracking-wider text-green-400/70 mb-3">
                            Biggest decreases
                          </div>
                          <div className="space-y-2">
                            {cmpResult.top_decreases.map((s) => (
                              <div key={s.service} className="flex justify-between text-sm">
                                <span className="text-fg-muted truncate mr-2">{s.service}</span>
                                <span className="text-green-400 shrink-0 font-mono text-xs">
                                  {s.change}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comparison chart */}
                  {cmpResult.service_breakdown && (
                    <ComparisonChart
                      data={cmpResult.service_breakdown
                        .filter((s) => s.current_cost > 0 || s.previous_cost > 0)
                        .slice(0, 8)
                        .map((s) => ({
                          label: s.service,
                          current: s.current_cost,
                          previous: s.previous_cost
                        }))}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {!cmpResult && !cmpLoading && (
            <div className="card text-center py-16">
              <div className="text-4xl mb-4">📈</div>
              <div className="text-fg-muted text-sm">
                Select a provider filter and click Compare.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
