import type { McpToolHandler } from "@/lib/mcp/types";
import { pingTool } from "./ping";

/**
 * Tool registry. Add new tools here as they're built.
 *
 * Week 1: ping
 * Week 2: query_costs
 * Week 3: top_services, compare_periods
 * Week 6: ai_spend
 * Week 7: estimate_iac
 */
export const tools: McpToolHandler[] = [pingTool];

export const toolsByName: Record<string, McpToolHandler> = Object.fromEntries(
  tools.map((t) => [t.definition.name, t])
);
