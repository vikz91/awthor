import { type McpConfiguration, type McpScope, mcpConfiguration } from "./config";

export type McpPrincipal = {
  clientId: string;
  expiresAt?: number;
  scopes: McpScope[];
  token: string;
  userId: string;
};

export type McpAuthenticationFailure = {
  error: "insufficient_scope" | "invalid_token" | "server_unavailable";
  message: string;
  status: 401 | 403 | 503;
};

/**
 * The subset of Clerk's `auth({ acceptsToken: "oauth_token" })` result that
 * Awthor needs. OAuth access tokens can be opaque, so Clerk must authenticate
 * the request instead of Awthor treating them as app-session JWTs.
 */
export type ClerkOAuthAuthentication = {
  clientId: string | null;
  isAuthenticated: boolean;
  scopes: readonly string[] | null;
  tokenType: string | null;
  userId: string | null;
};

function parseBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

function parseScopes(scope: unknown, configuration: McpConfiguration): McpScope[] {
  if (typeof scope !== "string") return [];
  return scope
    .split(/\s+/)
    .filter((item): item is McpScope => configuration.supportedScopes.includes(item as McpScope));
}

/**
 * Maps Clerk's already-verified OAuth request identity into Awthor's scoped
 * principal. App sessions and every non-OAuth machine token are rejected.
 */
export function authenticateMcpOAuthIdentity(
  identity: ClerkOAuthAuthentication,
  token: string,
  configuration: McpConfiguration = mcpConfiguration,
): McpPrincipal | McpAuthenticationFailure {
  if (
    !configuration.enabled ||
    !configuration.resourceUrl ||
    !configuration.authorizationServerUrl
  ) {
    return {
      error: "server_unavailable",
      message: "Remote MCP is not configured on this deployment.",
      status: 503,
    };
  }

  if (
    !identity.isAuthenticated ||
    identity.tokenType !== "oauth_token" ||
    !identity.userId ||
    !identity.clientId
  ) {
    return {
      error: "invalid_token",
      message: "The Bearer access token is invalid or expired.",
      status: 401,
    };
  }

  const scopes = parseScopes(identity.scopes?.join(" "), configuration);
  if (scopes.length === 0) {
    return {
      error: "insufficient_scope",
      message: "The access token does not grant an Awthor MCP scope.",
      status: 403,
    };
  }

  return {
    clientId: identity.clientId,
    scopes,
    token,
    userId: identity.userId,
  };
}

export function authenticateMcpBearerRequest(
  request: Request,
  identity: ClerkOAuthAuthentication,
): McpPrincipal | McpAuthenticationFailure {
  const token = parseBearerToken(request.headers.get("authorization"));
  if (!token) {
    return { error: "invalid_token", message: "A Bearer access token is required.", status: 401 };
  }

  return authenticateMcpOAuthIdentity(identity, token);
}

export function isMcpAuthenticationFailure(
  result: McpPrincipal | McpAuthenticationFailure,
): result is McpAuthenticationFailure {
  return "error" in result;
}

export function hasMcpScopes(
  principal: McpPrincipal,
  requiredScopes: readonly McpScope[],
): boolean {
  return requiredScopes.every((scope) => principal.scopes.includes(scope));
}
