import { verifyToken } from "@clerk/backend";
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

type TokenVerifier = (token: string) => Promise<Record<string, unknown>>;

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

function getStringClaim(claims: Record<string, unknown>, key: string): string | null {
  const claim = claims[key];
  return typeof claim === "string" && claim.length > 0 ? claim : null;
}

/** Verifies only OAuth Bearer credentials; Clerk app sessions are deliberately ignored. */
export async function verifyMcpAccessToken(
  token: string,
  tokenVerifier: TokenVerifier = (accessToken) =>
    verifyToken(accessToken, {
      audience: mcpConfiguration.resourceUrl ?? undefined,
      secretKey: process.env.CLERK_SECRET_KEY,
    }) as Promise<Record<string, unknown>>,
  configuration: McpConfiguration = mcpConfiguration,
): Promise<McpPrincipal | McpAuthenticationFailure> {
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

  try {
    const claims = await tokenVerifier(token);
    const issuer = getStringClaim(claims, "iss");
    const userId = getStringClaim(claims, "sub");

    if (issuer !== configuration.authorizationServerUrl || !userId) {
      return {
        error: "invalid_token",
        message: "The access token is not valid for Awthor MCP.",
        status: 401,
      };
    }

    const scopes = parseScopes(claims.scope, configuration);
    if (scopes.length === 0) {
      return {
        error: "insufficient_scope",
        message: "The access token does not grant an Awthor MCP scope.",
        status: 403,
      };
    }

    return {
      clientId: getStringClaim(claims, "client_id") ?? getStringClaim(claims, "azp") ?? "",
      expiresAt: typeof claims.exp === "number" ? claims.exp : undefined,
      scopes,
      token,
      userId,
    };
  } catch {
    return {
      error: "invalid_token",
      message: "The Bearer access token is invalid or expired.",
      status: 401,
    };
  }
}

export async function authenticateMcpBearerRequest(
  request: Request,
): Promise<McpPrincipal | McpAuthenticationFailure> {
  const token = parseBearerToken(request.headers.get("authorization"));
  if (!token) {
    return { error: "invalid_token", message: "A Bearer access token is required.", status: 401 };
  }

  return verifyMcpAccessToken(token);
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
