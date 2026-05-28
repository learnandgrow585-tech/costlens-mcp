"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ProviderStatus = {
  configured: boolean;
  connected:  boolean;
  error?:     string;
  note?:      string;
};

type HealthResponse = {
  data_source:     string;
  connected_count: number;
  providers: {
    aws:       ProviderStatus;
    azure:     ProviderStatus;
    gcp:       ProviderStatus;
    openai:    ProviderStatus;
    anthropic: ProviderStatus;
  };
};

function StatusBadge({ status }: { status: ProviderStatus }) {
  if (status.connected) {
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
        ✓ Connected
      </span>
    );
  }
  if (status.configured) {
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
        ✗ Credentials invalid
      </span>
    );
  }
  return (
    <span className="text-xs px-2.5 py-1 rounded-full bg-bg-subtle border border-border text-fg-subtle">
      Not connected
    </span>
  );
}

export default function ConnectPage() {
  const [health, setHealth]   = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setHealth(d as HealthResponse))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">

      <div className="mb-10">
        <div className="text-xs font-medium uppercase tracking-wider text-fg-subtle mb-2">
          Connect
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          Connect your cloud accounts
        </h1>
        <p className="text-fg-muted">
          CostLens works with sample data out of the box. Add credentials to
          serve real costs to your AI assistant.
        </p>
      </div>

      {/* Status overview */}
      <div className="card mb-8">
        <div className="text-xs font-medium uppercase tracking-wider text-fg-subtle mb-4">
          Connection status
        </div>
        {loading ? (
          <div className="text-fg-muted text-sm">Checking…</div>
        ) : (
          <div className="space-y-3">
            {health && Object.entries(health.providers).map(([key, status]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium capitalize text-fg">
                    {key === "aws" ? "Amazon Web Services (AWS)" :
                     key === "azure" ? "Microsoft Azure" :
                     key === "gcp" ? "Google Cloud (GCP)" :
                     key === "openai" ? "OpenAI" : "Anthropic"}
                  </div>
                  {(status as ProviderStatus).error && (
                    <div className="text-xs text-red-400 mt-0.5">
                      {(status as ProviderStatus).error}
                    </div>
                  )}
                  {(status as ProviderStatus).note && !(status as ProviderStatus).connected && (
                    <div className="text-xs text-fg-subtle mt-0.5">
                      {(status as ProviderStatus).note}
                    </div>
                  )}
                </div>
                <StatusBadge status={status as ProviderStatus} />
              </div>
            ))}
          </div>
        )}
        {health && (
          <div className="mt-4 pt-4 border-t border-border text-xs text-fg-subtle">
            Data source: <span className={health.data_source === "live" ? "text-green-400" : "text-accent"}>
              {health.data_source === "live"
                ? `🔴 Live (${health.connected_count} provider${health.connected_count !== 1 ? "s" : ""})`
                : "📊 Sample FOCUS data"}
            </span>
          </div>
        )}
      </div>

      {/* AWS setup guide */}
      <section className="space-y-4 mb-10">
        <h2 className="text-xl font-semibold">
          Connect AWS{" "}
          <span className="text-xs font-normal text-accent ml-2 px-2 py-0.5 border border-accent/30 rounded-full">
            Available now
          </span>
        </h2>

        <div className="card">
          <div className="text-accent text-xs font-medium uppercase tracking-wider mb-3">
            Step 1 — Create an IAM user (5 min)
          </div>
          <ol className="text-sm text-fg-muted space-y-2 list-decimal list-inside">
            <li>Go to <strong className="text-fg">console.aws.amazon.com → IAM → Users → Create user</strong></li>
            <li>Username: <code className="font-mono text-accent text-xs">costlens-readonly</code></li>
            <li>Select <strong className="text-fg">"Attach policies directly"</strong></li>
            <li>Search and attach: <code className="font-mono text-accent text-xs">AWSBillingReadOnlyAccess</code></li>
            <li>Click <strong className="text-fg">Create user</strong></li>
          </ol>
        </div>

        <div className="card">
          <div className="text-accent text-xs font-medium uppercase tracking-wider mb-3">
            Step 2 — Get access keys (2 min)
          </div>
          <ol className="text-sm text-fg-muted space-y-2 list-decimal list-inside">
            <li>Click the user you just created → <strong className="text-fg">Security credentials</strong></li>
            <li>Scroll to <strong className="text-fg">Access keys → Create access key</strong></li>
            <li>Use case: <strong className="text-fg">"Application running outside AWS"</strong></li>
            <li>Copy both <code className="font-mono text-accent text-xs">Access key ID</code> and <code className="font-mono text-accent text-xs">Secret access key</code></li>
            <li className="text-yellow-400/80">⚠ You only see the secret once — copy it now</li>
          </ol>
        </div>

        <div className="card">
          <div className="text-accent text-xs font-medium uppercase tracking-wider mb-3">
            Step 3 — Add to Vercel (2 min)
          </div>
          <ol className="text-sm text-fg-muted space-y-2 list-decimal list-inside">
            <li>Go to <strong className="text-fg">vercel.com → costlens-mcp project → Settings → Environment Variables</strong></li>
            <li>Add these two variables:</li>
          </ol>
          <div className="mt-3 space-y-2">
            <div className="bg-bg-subtle border border-border rounded-md p-3 font-mono text-xs">
              <div className="text-fg-subtle">Key</div>
              <div className="text-accent">AWS_ACCESS_KEY_ID</div>
              <div className="text-fg-subtle mt-2">Value</div>
              <div className="text-fg">AKIA••••••••••••••••</div>
            </div>
            <div className="bg-bg-subtle border border-border rounded-md p-3 font-mono text-xs">
              <div className="text-fg-subtle">Key</div>
              <div className="text-accent">AWS_SECRET_ACCESS_KEY</div>
              <div className="text-fg-subtle mt-2">Value</div>
              <div className="text-fg">••••••••••••••••••••••••••••••••••••••••</div>
            </div>
          </div>
          <p className="text-xs text-fg-subtle mt-3">
            Environment: <strong>Production and Preview</strong> (default is fine)
          </p>
        </div>

        <div className="card">
          <div className="text-accent text-xs font-medium uppercase tracking-wider mb-3">
            Step 4 — Redeploy (1 min)
          </div>
          <p className="text-sm text-fg-muted">
            Go to <strong className="text-fg">Vercel → Deployments → Redeploy</strong> (or push any commit).
            Then come back here and refresh — the AWS status above will turn green.
          </p>
        </div>

        <div className="card border-yellow-500/20 bg-yellow-500/5">
          <div className="text-yellow-400 text-xs font-medium uppercase tracking-wider mb-2">
            Cost notice
          </div>
          <p className="text-sm text-fg-muted">
            AWS Cost Explorer charges <strong className="text-fg">$0.01 per API request</strong>.
            CostLens makes 2 requests per tool call (current + previous month).
            At typical usage that is well under $1/month.
          </p>
        </div>
      </section>

      {/* Coming soon */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Coming in Week 5</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {["Microsoft Azure", "Google Cloud", "OpenAI + Anthropic"].map((name) => (
            <div key={name} className="card opacity-60">
              <div className="text-sm font-medium text-fg-muted">{name}</div>
              <div className="text-xs text-fg-subtle mt-1">Adapter in progress</div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10 pt-6 border-t border-border text-sm text-fg-subtle">
        After connecting, test in the{" "}
        <Link href="/dashboard" className="text-accent hover:underline">
          MCP playground
        </Link>{" "}
        — you will see "🔴 Live data" instead of "📊 Sample FOCUS data".
      </div>
    </div>
  );
}
