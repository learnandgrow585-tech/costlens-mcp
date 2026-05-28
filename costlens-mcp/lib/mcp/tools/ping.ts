import { z } from "zod";
import type { McpToolHandler } from "@/lib/mcp/types";

const inputSchema = z.object({}).strict();

export const pingTool: McpToolHandler = {
  definition: {
    name: "ping",
    description:
      "Health check. Returns server status, version, and current timestamp. Use to verify the MCP connection is alive before calling other tools.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  async call(args) {
    inputSchema.parse(args);
    const payload = {
      ok: true,
      service: "costlens-mcp",
      version: process.env.npm_package_version ?? "0.1.0",
      timestamp: new Date().toISOString()
    };
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(payload, null, 2)
        }
      ]
    };
  }
};
