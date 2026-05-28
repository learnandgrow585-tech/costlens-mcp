import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Returns which cloud providers are connected (credentials present + valid).
 * Safe to expose — never returns credential values.
 */
export async function GET() {
  const { getConnectionStatus } = await import("@/lib/focus/store");
  const status = await getConnectionStatus();

  const connectedCount = Object.values(status).filter(
    (p) => (p as { connected: boolean }).connected
  ).length;

  return NextResponse.json({
    ok:              true,
    service:         "costlens-mcp",
    version:         "0.1.0",
    data_source:     connectedCount > 0 ? "live" : "sample",
    connected_count: connectedCount,
    providers:       status
  });
}
