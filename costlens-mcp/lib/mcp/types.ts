/**
 * Minimal JSON-RPC 2.0 + MCP types.
 *
 * We implement the MCP protocol manually rather than pulling in the full
 * @modelcontextprotocol/sdk because:
 *   - Vercel serverless is stateless; we don't need session management.
 *   - Bundle size matters for cold starts.
 *   - The HTTP surface MCP needs is tiny: initialize, tools/list, tools/call.
 *
 * If the protocol grows beyond what this file covers, swap to the SDK.
 */

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcSuccess<T> {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: T;
}

export interface JsonRpcError {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type JsonRpcResponse<T = unknown> = JsonRpcSuccess<T> | JsonRpcError;

// MCP protocol shapes
export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface McpToolCallResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

export interface McpToolHandler {
  definition: McpToolDefinition;
  call: (args: Record<string, unknown>) => Promise<McpToolCallResult>;
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: {
    tools?: Record<string, unknown>;
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

// JSON-RPC error codes per spec
export const RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603
} as const;
