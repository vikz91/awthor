import { describe, expect, test } from "bun:test";
import { verifyMcpAccessToken } from "./auth";
import { resolveMcpConfiguration } from "./config";

describe("MCP OAuth bearer authentication", () => {
  test("does not authenticate a token when remote MCP is not configured", async () => {
    const result = await verifyMcpAccessToken("token", async () => {
      throw new Error("The verifier must not run without MCP configuration.");
    });

    expect(result).toMatchObject({ error: "server_unavailable", status: 503 });
  });

  test("accepts only a scoped token issued for the configured Clerk OAuth server", async () => {
    const configuration = resolveMcpConfiguration({
      CLERK_OAUTH_AUTHORIZATION_SERVER_URL: "https://clerk.example.test",
      CLERK_SECRET_KEY: "sk_test_example",
      MONGODB_URI: "mongodb://localhost:27017/awthor",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
      NEXT_PUBLIC_SITE_URL: "https://awthor.example",
    });
    const result = await verifyMcpAccessToken(
      "token",
      async () => ({
        azp: "chatgpt-client",
        exp: 12345,
        iss: "https://clerk.example.test",
        scope: "awthor.read awthor.write unrelated.scope",
        sub: "user_123",
      }),
      configuration,
    );

    expect(result).toEqual({
      clientId: "chatgpt-client",
      expiresAt: 12345,
      scopes: ["awthor.read", "awthor.write"],
      token: "token",
      userId: "user_123",
    });
  });

  test("rejects a bearer token from a different issuer", async () => {
    const configuration = resolveMcpConfiguration({
      CLERK_OAUTH_AUTHORIZATION_SERVER_URL: "https://clerk.example.test",
      CLERK_SECRET_KEY: "sk_test_example",
      MONGODB_URI: "mongodb://localhost:27017/awthor",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
      NEXT_PUBLIC_SITE_URL: "https://awthor.example",
    });
    const result = await verifyMcpAccessToken(
      "token",
      async () => ({ iss: "https://other.example.test", scope: "awthor.read", sub: "user_123" }),
      configuration,
    );

    expect(result).toMatchObject({ error: "invalid_token", status: 401 });
  });

  test("requires at least one explicitly granted Awthor scope", async () => {
    const configuration = resolveMcpConfiguration({
      CLERK_OAUTH_AUTHORIZATION_SERVER_URL: "https://clerk.example.test",
      CLERK_SECRET_KEY: "sk_test_example",
      MONGODB_URI: "mongodb://localhost:27017/awthor",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
      NEXT_PUBLIC_SITE_URL: "https://awthor.example",
    });
    const result = await verifyMcpAccessToken(
      "token",
      async () => ({ iss: "https://clerk.example.test", scope: "openid", sub: "user_123" }),
      configuration,
    );

    expect(result).toMatchObject({ error: "insufficient_scope", status: 403 });
  });
});
