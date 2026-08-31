import { describe, expect, test } from "bun:test";
import { authenticateMcpOAuthIdentity } from "./auth";
import { resolveMcpConfiguration } from "./config";

const configuration = resolveMcpConfiguration({
  CLERK_OAUTH_AUTHORIZATION_SERVER_URL: "https://clerk.example.test",
  CLERK_SECRET_KEY: "sk_test_example",
  MONGODB_URI: "mongodb://localhost:27017/awthor",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
  NEXT_PUBLIC_SITE_URL: "https://awthor.example",
});

describe("MCP OAuth bearer authentication", () => {
  test("does not authenticate a token when remote MCP is not configured", () => {
    const result = authenticateMcpOAuthIdentity(
      {
        clientId: "client_123",
        isAuthenticated: true,
        scopes: ["awthor.read"],
        tokenType: "oauth_token",
        userId: "user_123",
      },
      "token",
      resolveMcpConfiguration({}),
    );

    expect(result).toMatchObject({ error: "server_unavailable", status: 503 });
  });

  test("accepts a Clerk-verified, scoped OAuth identity", () => {
    const result = authenticateMcpOAuthIdentity(
      {
        clientId: "chatgpt-client",
        isAuthenticated: true,
        scopes: ["awthor.read", "awthor.write", "unrelated.scope"],
        tokenType: "oauth_token",
        userId: "user_123",
      },
      "token",
      configuration,
    );

    expect(result).toEqual({
      clientId: "chatgpt-client",
      scopes: ["awthor.read", "awthor.write"],
      token: "token",
      userId: "user_123",
    });
  });

  test("rejects a Clerk session and non-OAuth machine tokens", () => {
    const result = authenticateMcpOAuthIdentity(
      {
        clientId: null,
        isAuthenticated: true,
        scopes: ["awthor.read"],
        tokenType: "session_token",
        userId: "user_123",
      },
      "token",
      configuration,
    );

    expect(result).toMatchObject({ error: "invalid_token", status: 401 });
  });

  test("requires at least one explicitly granted Awthor scope", () => {
    const result = authenticateMcpOAuthIdentity(
      {
        clientId: "chatgpt-client",
        isAuthenticated: true,
        scopes: ["openid"],
        tokenType: "oauth_token",
        userId: "user_123",
      },
      "token",
      configuration,
    );

    expect(result).toMatchObject({ error: "insufficient_scope", status: 403 });
  });
});
