import type { McpAuthenticationFailure } from "./auth";
import { isAllowedMcpOrigin, mcpConfiguration } from "./config";

const jsonRpcError = (message: string) => ({
  error: { code: -32001, message },
  id: null,
  jsonrpc: "2.0",
});

export function validateMcpRequestOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (isAllowedMcpOrigin(origin)) return null;

  return Response.json(jsonRpcError("Origin is not allowed for this MCP endpoint."), {
    headers: { "Cache-Control": "no-store" },
    status: 403,
  });
}

export function createMcpAuthenticationError(
  failure: McpAuthenticationFailure,
  metadataUrl = mcpConfiguration.metadataUrl,
): Response {
  const headers = new Headers({ "Cache-Control": "no-store" });
  if ((failure.status === 401 || failure.status === 403) && metadataUrl) {
    headers.set(
      "WWW-Authenticate",
      `Bearer resource_metadata="${metadataUrl}", error="${failure.error}", error_description="${failure.message}"`,
    );
  }

  return Response.json(jsonRpcError(failure.message), { headers, status: failure.status });
}
