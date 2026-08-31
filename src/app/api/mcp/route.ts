import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getAwthorDatabase } from "@/lib/database/mongodb";
import { createRemoteWorkspaceService } from "@/lib/database/remote-workspace";
import {
  authenticateMcpBearerRequest,
  isMcpAuthenticationFailure,
  type McpPrincipal,
} from "@/lib/mcp/auth";
import { mcpConfiguration } from "@/lib/mcp/config";
import { createMcpAuthenticationError, validateMcpRequestOrigin } from "@/lib/mcp/http";
import { createRemoteMcpServer } from "@/lib/mcp/tool-registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unavailableResponse() {
  return Response.json(
    {
      error: { code: -32603, message: "Remote MCP is temporarily unavailable." },
      id: null,
      jsonrpc: "2.0",
    },
    { headers: { "Cache-Control": "no-store" }, status: 503 },
  );
}

async function handleMcpRequest(request: Request, principal: McpPrincipal): Promise<Response> {
  const database = await getAwthorDatabase();
  const service = createRemoteWorkspaceService(database, principal.userId);
  const server = createRemoteMcpServer({ scopes: principal.scopes, service });
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  return transport.handleRequest(request, {
    authInfo: {
      clientId: principal.clientId,
      expiresAt: principal.expiresAt,
      extra: { userId: principal.userId },
      resource: mcpConfiguration.resourceUrl ? new URL(mcpConfiguration.resourceUrl) : undefined,
      scopes: principal.scopes,
      token: principal.token,
    },
  });
}

async function requestHandler(request: Request): Promise<Response> {
  const originResponse = validateMcpRequestOrigin(request);
  if (originResponse) return originResponse;

  const authentication = await authenticateMcpBearerRequest(request);
  if (isMcpAuthenticationFailure(authentication)) {
    return createMcpAuthenticationError(authentication);
  }

  try {
    return await handleMcpRequest(request, authentication);
  } catch {
    return unavailableResponse();
  }
}

export const GET = requestHandler;
export const POST = requestHandler;
export const DELETE = requestHandler;
