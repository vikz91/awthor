import { describe, expect, test } from "bun:test";
import {
  getMcpAuthorizationServerMetadata,
  getMcpProtectedResourceMetadata,
  getMcpRequestUrls,
  isAllowedMcpOrigin,
  resolveMcpConfiguration,
} from "./config";

const configuredEnvironment = {
  CLERK_OAUTH_AUTHORIZATION_SERVER_URL: "https://clerk.example.test",
  CLERK_SECRET_KEY: "sk_test_example",
  MONGODB_URI: "mongodb://localhost:27017/awthor",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
  NEXT_PUBLIC_SITE_URL: "https://awthor.example",
};

describe("remote MCP configuration", () => {
  test("stays disabled until Clerk, a site URL, and its OAuth server are configured", () => {
    expect(resolveMcpConfiguration({}).enabled).toBeFalse();
    expect(
      resolveMcpConfiguration({
        CLERK_SECRET_KEY: "sk_test_example",
        MONGODB_URI: "mongodb://localhost:27017/awthor",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
        NEXT_PUBLIC_SITE_URL: "https://awthor.example",
      }).enabled,
    ).toBeFalse();
    expect(
      resolveMcpConfiguration({
        CLERK_OAUTH_AUTHORIZATION_SERVER_URL: "https://clerk.example.test",
        CLERK_SECRET_KEY: "sk_test_example",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
        NEXT_PUBLIC_SITE_URL: "https://awthor.example",
      }).enabled,
    ).toBeFalse();
  });

  test("builds protected-resource and authorization-server metadata from explicit URLs", () => {
    const configuration = resolveMcpConfiguration(configuredEnvironment);

    expect(getMcpProtectedResourceMetadata(configuration)).toMatchObject({
      authorization_servers: ["https://clerk.example.test"],
      resource: "https://awthor.example/mcp",
      scopes_supported: ["awthor.read", "awthor.write", "awthor.publish"],
    });
    expect(getMcpAuthorizationServerMetadata(configuration)).toMatchObject({
      authorization_endpoint: "https://clerk.example.test/oauth/authorize",
      issuer: "https://clerk.example.test",
      token_endpoint: "https://clerk.example.test/oauth/token",
    });
    expect(getMcpRequestUrls(new Request("https://awthor.example/mcp"), configuration)).toEqual({
      metadataUrl: "https://awthor.example/.well-known/oauth-protected-resource",
      resourceUrl: "https://awthor.example/mcp",
    });
    expect(getMcpRequestUrls(new Request("https://awthor.example/api/mcp"), configuration)).toEqual(
      {
        metadataUrl: "https://awthor.example/.well-known/oauth-protected-resource/api/mcp",
        resourceUrl: "https://awthor.example/api/mcp",
      },
    );
  });

  test("allows non-browser MCP clients while rejecting unknown browser origins", () => {
    const configuration = resolveMcpConfiguration({
      ...configuredEnvironment,
      MCP_ALLOWED_ORIGINS: "https://chatgpt.example,not-a-url",
    });

    expect(isAllowedMcpOrigin(null, configuration)).toBeTrue();
    expect(isAllowedMcpOrigin("https://awthor.example", configuration)).toBeTrue();
    expect(isAllowedMcpOrigin("https://chatgpt.example", configuration)).toBeTrue();
    expect(isAllowedMcpOrigin("https://untrusted.example", configuration)).toBeFalse();
  });
});
