import Link from "next/link";

export default function InstallPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-10">
        <div className="text-xs font-medium uppercase tracking-wider text-fg-subtle mb-2">
          Install
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Add CostLens to your AI tool</h1>
        <p className="text-fg-muted">
          CostLens runs as a remote MCP server. Point your AI tool at the URL below — no local
          install required.
        </p>
      </div>

      <section className="card mb-6">
        <h2 className="text-lg font-medium mb-3">Claude Desktop</h2>
        <p className="text-sm text-fg-muted mb-4">
          Open{" "}
          <code className="font-mono text-accent text-xs">claude_desktop_config.json</code> and add:
        </p>
        <pre className="bg-bg-subtle border border-border rounded-md p-4 text-xs font-mono overflow-x-auto">
{`{
  "mcpServers": {
    "costlens": {
      "url": "https://YOUR-VERCEL-URL/api/mcp"
    }
  }
}`}
        </pre>
        <p className="text-xs text-fg-subtle mt-3">
          Replace <code className="font-mono">YOUR-VERCEL-URL</code> with your deployment URL.
        </p>
      </section>

      <section className="card mb-6">
        <h2 className="text-lg font-medium mb-3">Windsurf</h2>
        <p className="text-sm text-fg-muted mb-4">
          Settings → MCP Servers → Add server:
        </p>
        <pre className="bg-bg-subtle border border-border rounded-md p-4 text-xs font-mono overflow-x-auto">
{`Name:      costlens
Transport: HTTP
URL:       https://YOUR-VERCEL-URL/api/mcp`}
        </pre>
      </section>

      <section className="card mb-6">
        <h2 className="text-lg font-medium mb-3">Cursor</h2>
        <p className="text-sm text-fg-muted mb-4">
          Settings → MCP → Add new server:
        </p>
        <pre className="bg-bg-subtle border border-border rounded-md p-4 text-xs font-mono overflow-x-auto">
{`{
  "costlens": {
    "url": "https://YOUR-VERCEL-URL/api/mcp"
  }
}`}
        </pre>
      </section>

      <section className="card">
        <h2 className="text-lg font-medium mb-3">Verify it works</h2>
        <p className="text-sm text-fg-muted mb-3">
          After adding, ask your assistant:
        </p>
        <div className="bg-bg-subtle border border-border rounded-md p-4 text-sm">
          <span className="text-fg-muted">&gt;</span> What MCP tools do you have from costlens?
        </div>
        <p className="text-xs text-fg-subtle mt-3">
          You should see <code className="font-mono">ping</code> listed. Or try the{" "}
          <Link href="/dashboard" className="text-accent hover:underline">
            playground
          </Link>{" "}
          first.
        </p>
      </section>
    </div>
  );
}
