import type { McpToolHandler } from "@/lib/mcp/types";
import { pingTool }               from "./ping";
import { queryCostsTool }          from "./query_costs";
import { topServicesTool }         from "./top_services";
import { comparePeriodsTool }      from "./compare_periods";
import { aiSpendTool }             from "./ai_spend";
import { detectAnomaliesTool }     from "./detect_anomalies";

/**
 * Tool registry — add new tools here as they are built.
 *
 * Week 1: ping
 * Week 2: query_costs
 * Week 3: top_services, compare_periods
 * Week 6: ai_spend
 * Week 7: detect_anomalies     ← NEW
 */
export const tools: McpToolHandler[] = [
  pingTool,
  queryCostsTool,
  topServicesTool,
  comparePeriodsTool,
  aiSpendTool,
  detectAnomaliesTool
];

export const toolsByName: Record<string, McpToolHandler> = Object.fromEntries(
  tools.map((t) => [t.definition.name, t])
);
