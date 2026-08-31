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
});
