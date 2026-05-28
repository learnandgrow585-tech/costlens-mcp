import { NextRequest, NextResponse } from "next/server";
import { handleMcpMessage } from "@/lib/mcp/server";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * MCP HTTP transport endpoint.
 * Accepts JSON-RPC 2.0 requests, returns JSON-RPC 2.0 responses.
 *
 * Claude Desktop / Windsurf / Cursor / Codex connect here via the `url`
 * field in their mcpServers config.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error: invalid JSON" }
      },
      { status: 400 }
    );
  }

  // Support JSON-RPC batches: array of requests.
  if (Array.isArray(body)) {
    const responses = await Promise.all(body.map((msg) => handleMcpMessage(msg)));
    const filtered = responses.filter((r) => r !== null);
    return NextResponse.json(filtered);
  }

  const response = await handleMcpMessage(body);
  // Notifications return null and produce a 204.
  if (response === null) {
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json(response);
}

export async function GET() {
  // Allow simple health pings via GET for monitoring tools.
  logger.debug("health GET");
  return NextResponse.json({
    ok: true,
    service: "costlens-mcp",
    transport: "http",
    accepts: "POST /api/mcp with JSON-RPC 2.0 body"
  });
}
