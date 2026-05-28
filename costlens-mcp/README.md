# CostLens MCP

> The Model Context Protocol server that lets your AI assistant answer questions about your cloud + AI spend.

CostLens is a **FOCUS-native** MCP server that connects Claude Desktop, Windsurf, Cursor, and Codex to your AWS, Azure, GCP, OpenAI, and Anthropic costs through a single endpoint. It also ships a web dashboard so you can explore costs yourself.

**Status:** Week 1 / 8 — public scaffold and `ping` tool live.

---

## Why

- **98% of FinOps teams now manage AI spend.** Up from 31% in 2024.
- **53% of them say they don't know where the money goes.**
- Existing FinOps tools (CloudZero, Vantage, Cloudability) live behind a web login — not where engineers actually work.

CostLens makes cost a tool call away.

## Architecture

One Next.js app, one Vercel deploy, two surfaces:

```
costlens.dev/                ← landing + playground UI
costlens.dev/api/mcp         ← MCP HTTP endpoint (JSON-RPC 2.0)
```

```
costlens-mcp/
├── app/                     # Next.js App Router (landing, dashboard, /api/mcp)
├── lib/
│   ├── mcp/                 # MCP server core + tools + adapters
│   ├── focus/               # FOCUS 1.2 schema + parsers (week 2)
│   └── utils/               # logger, helpers
├── data/samples/            # FOCUS sample CSVs (week 2)
└── tests/                   # vitest
```

## Tools (the agent-facing API)

| Tool             | Status   | Description                                       |
| ---------------- | -------- | ------------------------------------------------- |
| `ping`           | ✅ week 1 | Health check                                      |
| `query_costs`    | week 2   | NL queries against FOCUS data                     |
| `top_services`   | week 3   | Biggest spend by service / account                |
| `compare_periods`| week 3   | WoW / MoM deltas                                  |
| `ai_spend`       | week 6   | OpenAI + Anthropic + Bedrock usage                |
| `estimate_iac`   | week 7   | Terraform plan → monthly cost                     |
| `anomalies`      | week 7   | Spike detection                                   |

## Quickstart (local-free, browser-only)

This project is designed to develop entirely in the browser via GitHub + Vercel — no local install required.

1. **Fork / clone this repo** on GitHub.
2. **Connect to Vercel** → import the repo → deploy.
3. **Open `https://<your-vercel-url>/`** — landing page.
4. **Open `/dashboard`** — try the `ping` and `tools/list` calls.
5. **Open `/install`** — copy the config snippet for your AI tool.

Vercel auto-deploys every push. CI runs tests on every PR.

## Add to Claude Desktop

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "costlens": {
      "url": "https://<your-vercel-url>/api/mcp"
    }
  }
}
```

Restart Claude Desktop. Ask: *"What MCP tools do you have from costlens?"*

## Add to Windsurf

Settings → MCP Servers → Add:

```
Name:      costlens
Transport: HTTP
URL:       https://<your-vercel-url>/api/mcp
```

## Add to Cursor

Settings → MCP → Add server:

```json
{
  "costlens": { "url": "https://<your-vercel-url>/api/mcp" }
}
```

## Verifying the endpoint

A quick curl-equivalent (use the playground UI, or any HTTP client):

```http
POST /api/mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": { "name": "ping", "arguments": {} }
}
```

Expected response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      { "type": "text", "text": "{\"ok\":true,\"service\":\"costlens-mcp\",...}" }
    ]
  }
}
```

## Roadmap

- **Week 1** — Scaffold, ping, landing, dashboard shell ✅
- **Week 2** — FOCUS schema, CSV loader, `query_costs`, chart widget
- **Week 3** — `top_services`, `compare_periods`, Recharts
- **Week 4** — AWS CUR 2.0 adapter
- **Week 5** — Azure + GCP adapters
- **Week 6** — OpenAI + Anthropic + Bedrock usage adapters
- **Week 7** — Terraform plan parser + `estimate_iac` + anomalies
- **Week 8** — Polish, domain, launch (HN / Reddit / FinOps Slack / LinkedIn)

## License

MIT — see `LICENSE`.

## Acknowledgments

- [FinOps Foundation](https://finops.org) for the FOCUS specification.
- [Anthropic](https://www.anthropic.com/) for the Model Context Protocol.
