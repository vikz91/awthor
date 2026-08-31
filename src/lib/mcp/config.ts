const supportedMcpScopes = ["awthor.read", "awthor.write", "awthor.publish"] as const;

export type McpScope = (typeof supportedMcpScopes)[number];

export type McpConfiguration = {
  allowedOrigins: string[];
  authorizationServerUrl: string | null;
  enabled: boolean;
  metadataUrl: string | null;
  resourceUrl: string | null;
  siteUrl: string | null;
  supportedScopes: readonly McpScope[];
};

type Environment = Record<string, string | undefined>;

function normalizeUrl(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function normalizeOrigin(value: string): string | null {
  const url = normalizeUrl(value);
  if (!url) return null;

  return new URL(url).origin;
}

function allowedOrigins(value: string | undefined, siteUrl: string | null): string[] {
  const configured = (value ?? "")
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));
  const siteOrigin = siteUrl ? new URL(siteUrl).origin : null;
  return [...new Set(siteOrigin ? [siteOrigin, ...configured] : configured)];
}

/**
 * Remote MCP stays disabled until both Clerk and an explicit Clerk OAuth
 * authorization-server URL are configured. This prevents cookie-based app
 * authentication from accidentally becoming an MCP credential.
 */
export function resolveMcpConfiguration(environment: Environment): McpConfiguration {
  const siteUrl = normalizeUrl(environment.NEXT_PUBLIC_SITE_URL);
  const authorizationServerUrl = normalizeUrl(environment.CLERK_OAUTH_AUTHORIZATION_SERVER_URL);
  const clerkConfigured = Boolean(
    environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() && environment.CLERK_SECRET_KEY?.trim(),
  );
  const mongoConfigured = Boolean(environment.MONGODB_URI?.trim());
  const resourceUrl = siteUrl ? `${siteUrl}/api/mcp` : null;
  const metadataUrl = siteUrl ? `${siteUrl}/.well-known/oauth-protected-resource/api/mcp` : null;

  return {
    allowedOrigins: allowedOrigins(environment.MCP_ALLOWED_ORIGINS, siteUrl),
    authorizationServerUrl,
    enabled: Boolean(clerkConfigured && mongoConfigured && siteUrl && authorizationServerUrl),
    metadataUrl,
    resourceUrl,
    siteUrl,
    supportedScopes: supportedMcpScopes,
  };
}

export const mcpConfiguration = resolveMcpConfiguration(process.env);

export function getMcpProtectedResourceMetadata(configuration = mcpConfiguration) {
  if (!configuration.resourceUrl || !configuration.authorizationServerUrl) return null;

  return {
    authorization_servers: [configuration.authorizationServerUrl],
    bearer_methods_supported: ["header"],
    resource: configuration.resourceUrl,
    resource_name: "Awthor Remote MCP",
    scopes_supported: configuration.supportedScopes,
  };
}

export function getMcpAuthorizationServerMetadata(configuration = mcpConfiguration) {
  if (!configuration.authorizationServerUrl) return null;

  const endpoint = (path: string) =>
    new URL(path, `${configuration.authorizationServerUrl}/`).toString();

  return {
    authorization_endpoint: endpoint("oauth/authorize"),
    code_challenge_methods_supported: ["S256"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    issuer: configuration.authorizationServerUrl,
    registration_endpoint: endpoint("oauth/register"),
    response_types_supported: ["code"],
    scopes_supported: configuration.supportedScopes,
    token_endpoint: endpoint("oauth/token"),
    token_endpoint_auth_methods_supported: ["client_secret_basic", "none"],
  };
}

export function isAllowedMcpOrigin(
  origin: string | null,
  configuration = mcpConfiguration,
): boolean {
  return origin === null || configuration.allowedOrigins.includes(origin);
}
