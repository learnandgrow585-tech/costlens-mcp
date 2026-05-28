import type { McpToolHandler } from "@/lib/mcp/types";
import { pingTool } from "./ping";
import { queryCostsTool } from "./query_costs";

/**
 * Tool registry. Add new tools here as they are built.
 *
 * Week 1: ping
 * Week 2: query_costs  ← NEW
 * Week 3: top_services, compare_periods
 * Week 6: ai_spend
 * Week 7: estimate_iac, anomalies
 */
export const tools: McpToolHandler[] = [
  pingTool,
  queryCostsTool
];

export const toolsByName: Record<string, McpToolHandler> = Object.fromEntries(
  tools.map((t) => [t.definition.name, t])
);
