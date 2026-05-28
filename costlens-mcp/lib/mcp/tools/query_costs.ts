import { z } from "zod";
import { queryCosts } from "@/lib/focus/query-engine";
import { getRecords }  from "@/lib/focus/store";
import type { McpToolHandler } from "@/lib/mcp/types";

const inputSchema = z.object({
  question: z
    .string()
    .min(3, "Question must be at least 3 characters")
    .max(500, "Question too long — keep it under 500 chars"),
  provider: z
    .enum(["aws", "azure", "gcp", "openai", "anthropic", "all"])
    .optional(),
  period: z
    .enum(["current_month", "last_month", "all"])
    .optional()
    .default("current_month")
});

export const queryCostsTool: McpToolHandler = {
  definition: {
    name: "query_costs",
    description: `Query cloud and AI vendor costs using natural language.
Understands questions like:
  - "How much did we spend on AWS this month?"
  - "What are our top 5 most expensive services?"
  - "Compare this month vs last month"
  - "How much are we spending on AI and machine learning?"
Returns a structured breakdown with totals, service-level detail, and a confidence score.
Automatically uses live AWS data if credentials are configured, otherwise sample FOCUS data.`,
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Natural language cost question" },
        provider: {
          type: "string",
          enum: ["aws", "azure", "gcp", "openai", "anthropic", "all"],
          description: "Optional provider filter"
        },
        period: {
          type: "string",
          enum: ["current_month", "last_month", "all"],
          description: "Billing period (default: current_month)"
        }
      },
      required: ["question"]
    }
  },

  async call(args) {
    const parsed = inputSchema.safeParse(args);
    if (!parsed.success) {
      return {
        content: [{ type: "text", text: JSON.stringify({
          error: `Invalid input: ${parsed.error.issues.map((i) => i.message).join(", ")}`
        })}],
        isError: true
      };
    }

    // Fetch live or sample records
    const { records, source, note } = await getRecords();
    const result = queryCosts(parsed.data.question, records, source);

    const output = {
      answer:           result.answer,
      total_cost:       `$${result.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      total_raw:        result.total,
      currency:         result.currency,
      period:           result.period,
      confidence_score: result.confidence_score,
      data_source:      source,
      top_services: result.breakdown.slice(0, 5).map((b) => ({
        service:    b.label,
        cost:       `$${b.cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        percentage: `${b.percentage}%`
      })),
      full_breakdown: result.breakdown,
      record_count:   result.record_count,
      ...(note ? { note } : {}),
      ...(result.note ? { note: result.note } : {})
    };

    return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }] };
  }
};
