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

function EnvVarBox({ name, hint }: { name: string; hint: string }) {
  return (
    <div className="bg-bg-subtle border border-border rounded-md p-3 font-mono text-xs">
      <div className="text-fg-subtle text-xs not-italic">Key</div>
      <div className="text-accent">{name}</div>
      <div className="text-fg-subtle mt-2 text-xs">Value</div>
      <div className="text-fg-muted">{hint}</div>
    </div>
  );
}

export default function ConnectPage() {
  const [health, setHealth]   = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [openProvider, setOpenProvider] = useState<string | null>("aws");

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
          CostLens works with sample data out of the box. Add credentials below
          to serve real costs to your AI assistant.
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
                  <div className="text-sm font-medium text-fg">
                    {key === "aws" ? "Amazon Web Services (AWS)" :
                     key === "azure" ? "Microsoft Azure" :
                     key === "gcp" ? "Google Cloud (GCP)" :
                     key === "openai" ? "OpenAI" : "Anthropic"}
                  </div>
                  {(status as ProviderStatus).error && (
                    <div className="text-xs text-red-400 mt-0.5 max-w-md truncate" title={(status as ProviderStatus).error}>
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
            Data source:{" "}
            <span className={health.data_source === "live" ? "text-green-400" : "text-accent"}>
              {health.data_source === "live"
                ? `🔴 Live (${health.connected_count} provider${health.connected_count !== 1 ? "s" : ""})`
                : "📊 Sample FOCUS data"}
            </span>
          </div>
        )}
      </div>

      {/* Setup accordions */}
      <div className="space-y-3 mb-10">

        {/* ── AWS ───────────────────────────────────────────────────── */}
        <details
          open={openProvider === "aws"}
          onToggle={(e) => e.currentTarget.open && setOpenProvider("aws")}
          className="card cursor-pointer"
        >
          <summary className="flex items-center justify-between cursor-pointer list-none">
            <div className="flex items-center gap-3">
              <span className="text-xl">☁️</span>
              <div>
                <div className="font-semibold text-fg">Amazon Web Services</div>
                <div className="text-xs text-fg-subtle">Cost Explorer API</div>
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 border border-accent/30 rounded-full text-accent">
              Available
            </span>
          </summary>

          <div className="mt-6 space-y-4">
            <div>
              <div className="text-accent text-xs font-medium uppercase tracking-wider mb-2">Step 1 — IAM user</div>
              <ol className="text-sm text-fg-muted space-y-1.5 list-decimal list-inside">
                <li>Console → IAM → Users → <strong className="text-fg">Create user</strong></li>
                <li>Name: <code className="font-mono text-accent text-xs">costlens-readonly</code></li>
                <li>Attach policy directly: <code className="font-mono text-accent text-xs">AWSBillingReadOnlyAccess</code></li>
                <li>Create user</li>
              </ol>
            </div>
            <div>
              <div className="text-accent text-xs font-medium uppercase tracking-wider mb-2">Step 2 — Access keys</div>
              <ol className="text-sm text-fg-muted space-y-1.5 list-decimal list-inside">
                <li>User → Security credentials → <strong className="text-fg">Create access key</strong></li>
                <li>Use case: <strong className="text-fg">Application running outside AWS</strong></li>
                <li className="text-yellow-400/80">⚠ Copy the secret immediately — shown only once</li>
              </ol>
            </div>
            <div>
              <div className="text-accent text-xs font-medium uppercase tracking-wider mb-2">Step 3 — Add to Vercel env vars</div>
              <div className="space-y-2">
                <EnvVarBox name="AWS_ACCESS_KEY_ID"     hint="AKIA••••••••••••••••" />
                <EnvVarBox name="AWS_SECRET_ACCESS_KEY" hint="40-char secret" />
                <EnvVarBox name="AWS_REGION"            hint="us-east-1 (optional)" />
              </div>
            </div>
            <div className="text-xs text-yellow-400/80 bg-yellow-500/5 border border-yellow-500/20 rounded p-3">
              💵 Cost: $0.01 per Cost Explorer API call. CostLens makes ~2 calls per query. Typical: under $1/month.
            </div>
          </div>
        </details>

        {/* ── Azure ─────────────────────────────────────────────────── */}
        <details
          open={openProvider === "azure"}
          onToggle={(e) => e.currentTarget.open && setOpenProvider("azure")}
          className="card cursor-pointer"
        >
          <summary className="flex items-center justify-between cursor-pointer list-none">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔷</span>
              <div>
                <div className="font-semibold text-fg">Microsoft Azure</div>
                <div className="text-xs text-fg-subtle">Cost Management API</div>
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 border border-accent/30 rounded-full text-accent">
              New
            </span>
          </summary>

          <div className="mt-6 space-y-4">
            <div>
              <div className="text-accent text-xs font-medium uppercase tracking-wider mb-2">
                Step 1 — Create service principal (Cloud Shell)
              </div>
              <p className="text-sm text-fg-muted mb-2">Open Azure Cloud Shell (top bar &gt;_) and run:</p>
              <pre className="bg-bg-subtle border border-border rounded-md p-3 text-xs font-mono overflow-x-auto text-fg">
{`az ad sp create-for-rbac \\
  --name "costlens-readonly" \\
  --role "Cost Management Reader" \\
  --scopes /subscriptions/<SUBSCRIPTION_ID>`}
              </pre>
              <p className="text-xs text-fg-subtle mt-2">
                Replace <code className="text-accent">&lt;SUBSCRIPTION_ID&gt;</code> with your subscription ID (Settings → Subscriptions).
                Save the output — you need <code className="text-accent">appId</code>, <code className="text-accent">password</code>, <code className="text-accent">tenant</code>.
              </p>
            </div>
            <div>
              <div className="text-accent text-xs font-medium uppercase tracking-wider mb-2">Step 2 — Add to Vercel env vars</div>
              <div className="space-y-2">
                <EnvVarBox name="AZURE_TENANT_ID"       hint="from tenant field" />
                <EnvVarBox name="AZURE_CLIENT_ID"       hint="from appId field" />
                <EnvVarBox name="AZURE_CLIENT_SECRET"   hint="from password field" />
                <EnvVarBox name="AZURE_SUBSCRIPTION_ID" hint="your subscription GUID" />
              </div>
            </div>
            <div className="text-xs text-green-400/80 bg-green-500/5 border border-green-500/20 rounded p-3">
              💚 Cost: Azure Cost Management API is free.
            </div>
          </div>
        </details>

        {/* ── OpenAI ────────────────────────────────────────────────── */}
        <details
          open={openProvider === "openai"}
          onToggle={(e) => e.currentTarget.open && setOpenProvider("openai")}
          className="card cursor-pointer"
        >
          <summary className="flex items-center justify-between cursor-pointer list-none">
            <div className="flex items-center gap-3">
              <span className="text-xl">🤖</span>
              <div>
                <div className="font-semibold text-fg">OpenAI</div>
                <div className="text-xs text-fg-subtle">Usage API — GPT-4o, o1, and more</div>
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 border border-accent/30 rounded-full text-accent">
              New
            </span>
          </summary>

          <div className="mt-6 space-y-4">
            <div>
              <div className="text-accent text-xs font-medium uppercase tracking-wider mb-2">Step 1 — Create an API key</div>
              <ol className="text-sm text-fg-muted space-y-1.5 list-decimal list-inside">
                <li>Go to <strong className="text-fg">platform.openai.com/api-keys</strong></li>
                <li>Click <strong className="text-fg">Create new secret key</strong></li>
                <li>Copy the key immediately — shown only once</li>
              </ol>
              <p className="text-xs text-fg-subtle mt-2">
                A regular API key is enough to connect. For live billing data, you also need an <strong className="text-fg">Admin API key</strong> (see Step 2).
              </p>
            </div>
            <div>
              <div className="text-accent text-xs font-medium uppercase tracking-wider mb-2">
                Step 2 — Admin key for billing data (optional)
              </div>
              <ol className="text-sm text-fg-muted space-y-1.5 list-decimal list-inside">
                <li>Go to <strong className="text-fg">platform.openai.com/settings/organization/admin-keys</strong></li>
                <li>Click <strong className="text-fg">Create Admin API key</strong></li>
                <li>Grant the <code className="font-mono text-accent text-xs">Usage Reporting</code> scope</li>
                <li className="text-yellow-400/80">⚠ Use this key (not your regular sk- key) for live spend figures</li>
              </ol>
            </div>
            <div>
              <div className="text-accent text-xs font-medium uppercase tracking-wider mb-2">Step 3 — Add to Vercel env vars</div>
              <div className="space-y-2">
                <EnvVarBox name="OPENAI_API_KEY" hint="sk-admin-... (Admin key) or sk-... (connection only)" />
              </div>
            </div>
            <div className="text-xs text-green-400/80 bg-green-500/5 border border-green-500/20 rounded p-3">
              💚 Cost: OpenAI Usage API is free. Sample cost figures are shown until an Admin key with Usage Reporting scope is added.
            </div>
          </div>
        </details>

        {/* ── Anthropic ─────────────────────────────────────────────── */}
        <details
          open={openProvider === "anthropic"}
          onToggle={(e) => e.currentTarget.open && setOpenProvider("anthropic")}
          className="card cursor-pointer"
        >
          <summary className="flex items-center justify-between cursor-pointer list-none">
            <div className="flex items-center gap-3">
              <span className="text-xl">🧠</span>
              <div>
                <div className="font-semibold text-fg">Anthropic</div>
                <div className="text-xs text-fg-subtle">Claude API — connection verification</div>
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 border border-accent/30 rounded-full text-accent">
              New
            </span>
          </summary>

          <div className="mt-6 space-y-4">
            <div>
              <div className="text-accent text-xs font-medium uppercase tracking-wider mb-2">Step 1 — Create an API key</div>
              <ol className="text-sm text-fg-muted space-y-1.5 list-decimal list-inside">
                <li>Go to <strong className="text-fg">console.anthropic.com/settings/keys</strong></li>
                <li>Click <strong className="text-fg">Create Key</strong></li>
                <li>Copy the key immediately — shown only once</li>
              </ol>
            </div>
            <div>
              <div className="text-accent text-xs font-medium uppercase tracking-wider mb-2">Step 2 — Add to Vercel env vars</div>
              <div className="space-y-2">
                <EnvVarBox name="ANTHROPIC_API_KEY" hint="sk-ant-api03-..." />
              </div>
            </div>
            <div className="text-xs text-yellow-400/80 bg-yellow-500/5 border border-yellow-500/20 rounded p-3">
              ℹ️ Anthropic does not yet offer a public billing cost API. Adding your key enables connection verification and shows
              realistic sample Claude cost estimates in the dashboard. Live billing data will be added as soon as Anthropic releases a cost endpoint.
            </div>
          </div>
        </details>

        {/* ── GCP ───────────────────────────────────────────────────── */}
        <details
          open={openProvider === "gcp"}
          onToggle={(e) => e.currentTarget.open && setOpenProvider("gcp")}
          className="card cursor-pointer"
        >
          <summary className="flex items-center justify-between cursor-pointer list-none">
            <div className="flex items-center gap-3">
              <span className="text-xl">🟢</span>
              <div>
                <div className="font-semibold text-fg">Google Cloud Platform</div>
                <div className="text-xs text-fg-subtle">BigQuery billing export</div>
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 border border-accent/30 rounded-full text-accent">
              New
            </span>
          </summary>

          <div className="mt-6 space-y-4">
            <div>
              <div className="text-accent text-xs font-medium uppercase tracking-wider mb-2">
                Step 1 — Enable BigQuery billing export
              </div>
              <ol className="text-sm text-fg-muted space-y-1.5 list-decimal list-inside">
                <li>GCP Console → Billing → <strong className="text-fg">Billing export</strong></li>
                <li>Click <strong className="text-fg">"BigQuery export"</strong> → Edit settings</li>
                <li>Pick or create a dataset (e.g. <code className="font-mono text-accent text-xs">billing_export</code>)</li>
                <li>Enable <strong className="text-fg">"Detailed usage cost"</strong></li>
                <li className="text-yellow-400/80">⚠ Wait ~24 hours for first data to populate</li>
              </ol>
              <p className="text-xs text-fg-subtle mt-2">
                Note the full table name. Format:{" "}
                <code className="text-accent">PROJECT.DATASET.gcp_billing_export_v1_XXXXXXXX</code>
              </p>
            </div>
            <div>
              <div className="text-accent text-xs font-medium uppercase tracking-wider mb-2">
                Step 2 — Create service account
              </div>
              <ol className="text-sm text-fg-muted space-y-1.5 list-decimal list-inside">
                <li>IAM &amp; Admin → Service Accounts → <strong className="text-fg">Create</strong></li>
                <li>Name: <code className="font-mono text-accent text-xs">costlens-readonly</code></li>
                <li>Grant roles: <code className="font-mono text-accent text-xs">BigQuery Data Viewer</code> + <code className="font-mono text-accent text-xs">BigQuery Job User</code></li>
                <li>Keys tab → Add key → <strong className="text-fg">Create new key</strong> → JSON</li>
                <li>The JSON file downloads — open it in any text editor</li>
              </ol>
            </div>
            <div>
              <div className="text-accent text-xs font-medium uppercase tracking-wider mb-2">Step 3 — Add to Vercel env vars</div>
              <div className="space-y-2">
                <EnvVarBox name="GCP_SERVICE_ACCOUNT_KEY"    hint="paste entire JSON file content as one line" />
                <EnvVarBox name="GCP_BILLING_BIGQUERY_TABLE" hint="my-project.billing_export.gcp_billing_export_v1_ABCDEF" />
              </div>
              <p className="text-xs text-fg-subtle mt-2">
                Tip: when pasting the JSON into Vercel, keep it on a single line — Vercel preserves the value verbatim.
              </p>
            </div>
            <div className="text-xs text-yellow-400/80 bg-yellow-500/5 border border-yellow-500/20 rounded p-3">
              💵 Cost: BigQuery charges $5/TB scanned. Monthly billing data is &lt; 100 MB — fractions of a cent per query.
            </div>
          </div>
        </details>
      </div>

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
