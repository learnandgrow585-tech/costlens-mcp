import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      {/* Hero */}
      <section className="pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs text-fg-muted mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          MCP server + dashboard · FOCUS 1.2 native
        </div>
        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.05] mb-6">
          Ask your AI assistant
          <br />
          about your <span className="gradient-text">cloud + AI spend</span>.
        </h1>
        <p className="text-lg text-fg-muted max-w-2xl mx-auto mb-10">
          CostLens connects Claude Desktop, Windsurf, Cursor, and Codex to your AWS, Azure, GCP, OpenAI,
          and Anthropic costs through a single Model Context Protocol server. Plus a dashboard to
          explore it yourself.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/dashboard" className="btn-primary">
            Try the playground →
          </Link>
          <Link href="/install" className="btn-secondary">
            Add to Claude Desktop
          </Link>
        </div>
        <p className="text-xs text-fg-subtle mt-6">
          Free + open source. No account required to self-host.
        </p>
      </section>

      {/* Features */}
      <section className="grid sm:grid-cols-3 gap-4 pb-24">
        <div className="card">
          <div className="text-accent text-xs font-medium uppercase tracking-wider mb-3">
            Multi-cloud
          </div>
          <h3 className="text-lg font-medium mb-2">AWS · Azure · GCP</h3>
          <p className="text-sm text-fg-muted leading-relaxed">
            Reads FOCUS 1.2+ exports natively. One schema, every cloud. No translation tax.
          </p>
        </div>
        <div className="card">
          <div className="text-accent text-xs font-medium uppercase tracking-wider mb-3">
            AI spend
          </div>
          <h3 className="text-lg font-medium mb-2">OpenAI · Anthropic · Bedrock</h3>
          <p className="text-sm text-fg-muted leading-relaxed">
            Tokens, models, GPU hours. The line item your CFO keeps asking about.
          </p>
        </div>
        <div className="card">
          <div className="text-accent text-xs font-medium uppercase tracking-wider mb-3">
            Shift-left
          </div>
          <h3 className="text-lg font-medium mb-2">Estimate before apply</h3>
          <p className="text-sm text-fg-muted leading-relaxed">
            Point at a Terraform plan. Get a monthly cost estimate before resources spin up.
          </p>
        </div>
      </section>

      {/* Why */}
      <section className="pb-24">
        <div className="card max-w-3xl mx-auto">
          <div className="text-xs font-medium uppercase tracking-wider text-fg-subtle mb-3">
            Why this exists
          </div>
          <p className="text-fg leading-relaxed mb-3">
            <strong>98% of FinOps teams now manage AI spend.</strong> 53% admit they don&apos;t
            understand the full scope of it. Existing tools (CloudZero, Vantage, Cloudability) live
            behind a web login — they don&apos;t live where your engineers actually work.
          </p>
          <p className="text-fg-muted leading-relaxed">
            CostLens makes cost a tool call away. The same place your team already asks every other
            question.
          </p>
        </div>
      </section>

      {/* Tools list */}
      <section className="pb-24">
        <h2 className="text-2xl font-semibold mb-6 text-center">Tools your agent gets</h2>
        <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
          {[
            ["query_costs", "Natural-language cost queries against FOCUS data"],
            ["ai_spend", "OpenAI + Anthropic + Bedrock usage by team or model"],
            ["compare_periods", "Week-over-week, month-over-month deltas"],
            ["top_services", "Biggest spend by service, account, or tag"],
            ["estimate_iac", "Cost of a Terraform plan before apply"],
            ["anomalies", "Spike detection across providers"]
          ].map(([name, desc]) => (
            <div key={name} className="card">
              <code className="text-accent text-sm font-mono">{name}</code>
              <p className="text-sm text-fg-muted mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
