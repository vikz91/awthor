import { describe, expect, test } from "bun:test";
import { createMcpAuthenticationError, validateMcpRequestOrigin } from "./http";

describe("MCP HTTP boundary", () => {
  test("rejects browser requests from an unknown origin", async () => {
    const response = validateMcpRequestOrigin(
      new Request("https://awthor.example/api/mcp", {
        headers: { origin: "https://untrusted.example" },
      }),
    );

    expect(response?.status).toBe(403);
    expect((await response?.json())?.error.message).toContain("Origin");
  });

  test("returns a JSON-RPC-compatible unavailable response without credentials metadata", async () => {
    const response = createMcpAuthenticationError({
      error: "server_unavailable",
      message: "Remote MCP is not configured on this deployment.",
      status: 503,
    });

    expect(response.status).toBe(503);
    expect(response.headers.get("www-authenticate")).toBeNull();
    expect((await response.json()).jsonrpc).toBe("2.0");
  });

  test("advertises the request endpoint's protected-resource metadata", () => {
    const response = createMcpAuthenticationError(
      {
        error: "invalid_token",
        message: "A Bearer access token is required.",
        status: 401,
      },
      "https://awthor.example/.well-known/oauth-protected-resource",
    );

    expect(response.headers.get("www-authenticate")).toBe(
      'Bearer resource_metadata="https://awthor.example/.well-known/oauth-protected-resource", error="invalid_token", error_description="A Bearer access token is required."',
    );
  });
});
