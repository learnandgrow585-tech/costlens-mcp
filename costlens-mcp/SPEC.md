# CostLens MCP — Specification (Permanent Context)

> Paste this at the start of every Claude conversation about CostLens.
> Keep it short and stable; week-by-week scope lives in the prompt of the day, not here.

## Purpose

An MCP server + web dashboard that lets AI assistants (Claude Desktop, Windsurf, Cursor, Codex) answer natural-language questions about:

1. **Cloud spend** — AWS, Azure, GCP — via FOCUS 1.2+ exports.
2. **AI vendor spend** — OpenAI, Anthropic, Bedrock — via usage APIs.
3. **Shift-left cost estimation** — Terraform plan JSON → monthly cost.

## Stack (non-negotiable)

- **Next.js 14+** (App Router), **TypeScript strict**, deployed to **Vercel**.
- **Tailwind CSS** for styling (no shadcn CLI — utility classes only).
- **Zod** for all input validation.
- **Pino** for structured JSON logging.
- **Vitest** for tests.
- MCP HTTP transport implemented manually (JSON-RPC 2.0). No `@modelcontextprotocol/sdk` dependency — Vercel serverless is stateless and the protocol surface is small.
- No paid services in MVP. No local-only dependencies.

## Architecture

Single repo, single Vercel deploy:

```
/app                         # Next.js routes
  /page.tsx                  # Landing
  /dashboard/page.tsx        # Playground UI
  /install/page.tsx          # Install instructions
  /api/mcp/route.ts          # MCP HTTP endpoint
/lib
  /mcp
    server.ts                # JSON-RPC + MCP method dispatcher
    types.ts                 # Protocol types
    /tools                   # Each MCP tool in its own file
    /adapters                # Cloud + AI vendor adapters (week 4+)
  /focus                     # FOCUS 1.2 schema + parser (week 2)
  /utils
    logger.ts
/data/samples                # FOCUS sample CSVs from FinOps Foundation
/tests                       # vitest
```

## MCP tools (build in this order)

| Order | Tool             | Week | Purpose                                              |
| ----- | ---------------- | ---- | ---------------------------------------------------- |
| 1     | `ping`           | 1    | Health check                                         |
| 2     | `query_costs`    | 2    | Natural-language cost queries over FOCUS data        |
| 3     | `top_services`   | 3    | Biggest spend by service / account / tag             |
| 4     | `compare_periods`| 3    | Week-over-week / month-over-month deltas             |
| 5     | `ai_spend`       | 6    | OpenAI / Anthropic / Bedrock usage by team or model  |
| 6     | `estimate_iac`   | 7    | Parse Terraform plan → monthly cost estimate         |
| 7     | `anomalies`      | 7    | Spike detection across providers                     |

## UI surfaces

- `/` — landing page with feature cards and CTAs
- `/dashboard` — interactive playground (query box, charts from week 3)
- `/install` — copy-paste config snippets for each AI tool
- `/api/mcp` — POST endpoint, JSON-RPC 2.0

## Constraints

- **Solo developer, browser-only dev environment** (GitHub web / Codespaces).
- **8-week MVP timeline.**
- **UI is a sales tool** — must look polished from day one.
- All MCP tools validate input with Zod, return structured JSON, handle errors gracefully, never crash on bad input.
- All adapters retry with exponential backoff and respect timeouts.

## Non-goals (MVP)

- Multi-tenant SaaS auth (week 9+)
- SSO / RBAC (post-launch, enterprise tier)
- Real-time streaming responses (use polling)
- Custom dashboards beyond the playground
- Mobile-first UI (desktop-first is fine)

## Workflow rules

- One week of scope per Claude conversation. Don't sprawl.
- Every tool gets a corresponding vitest unit test.
- Every PR runs the CI workflow (test + build).
- README is updated whenever the tool list changes.
