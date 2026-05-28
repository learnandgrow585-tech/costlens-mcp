import { logger } from "@/lib/utils/logger";
import { toolsByName, tools } from "@/lib/mcp/tools";
import {
  RPC_ERRORS,
  type InitializeResult,
  type JsonRpcRequest,
  type JsonRpcResponse
} from "@/lib/mcp/types";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "costlens-mcp";
const SERVER_VERSION = "0.1.0";

/**
 * Stateless MCP message handler. Takes a JSON-RPC request, returns a response.
 * Designed for serverless invocation — no session, no state between calls.
 */
export async function handleMcpMessage(
  raw: unknown
): Promise<JsonRpcResponse | null> {
  // Validate envelope
  if (!isRequest(raw)) {
    return rpcError(null, RPC_ERRORS.INVALID_REQUEST, "Invalid JSON-RPC request");
  }
  const req = raw;
  const log = logger.child({ method: req.method, id: req.id });
  log.info("mcp request");

  try {
    switch (req.method) {
      case "initialize":
        return rpcOk<InitializeResult>(req.id ?? null, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION }
        });

      case "notifications/initialized":
        // Notification — no response expected.
        return null;

      case "ping":
        return rpcOk(req.id ?? null, {});

      case "tools/list":
        return rpcOk(req.id ?? null, {
          tools: tools.map((t) => t.definition)
        });

      case "tools/call": {
        const params = (req.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
        const name = params.name;
        if (!name || typeof name !== "string") {
          return rpcError(req.id ?? null, RPC_ERRORS.INVALID_PARAMS, "Missing tool name");
        }
        const tool = toolsByName[name];
        if (!tool) {
          return rpcError(req.id ?? null, RPC_ERRORS.METHOD_NOT_FOUND, `Unknown tool: ${name}`);
        }
        try {
          const result = await tool.call(params.arguments ?? {});
          return rpcOk(req.id ?? null, result);
        } catch (err) {
          log.error({ err }, "tool call failed");
          return rpcOk(req.id ?? null, {
            content: [
              {
                type: "text",
                text: `Error: ${err instanceof Error ? err.message : String(err)}`
              }
            ],
            isError: true
          });
        }
      }

      default:
        // Notifications start with "notifications/"; ignore unknown ones quietly.
        if (req.method.startsWith("notifications/")) {
          return null;
        }
        return rpcError(
          req.id ?? null,
          RPC_ERRORS.METHOD_NOT_FOUND,
          `Method not found: ${req.method}`
        );
    }
  } catch (err) {
    log.error({ err }, "internal error handling mcp message");
    return rpcError(
      req.id ?? null,
      RPC_ERRORS.INTERNAL_ERROR,
      err instanceof Error ? err.message : "Internal error"
    );
  }
}

function isRequest(x: unknown): x is JsonRpcRequest {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return o.jsonrpc === "2.0" && typeof o.method === "string";
}

function rpcOk<T>(id: JsonRpcRequest["id"] | null, result: T): JsonRpcResponse<T> {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function rpcError(
  id: JsonRpcRequest["id"] | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message, data }
  };
}
