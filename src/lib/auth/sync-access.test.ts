import { describe, expect, test } from "bun:test";
import { resolveAdminEmails } from "./config";
import { resolveSyncAccountAccess } from "./sync-access";

describe("cloud account allowlist", () => {
  test("normalizes and de-duplicates configured email addresses", () => {
    expect(
      resolveAdminEmails(" Writer@Example.com, editor@example.com,writer@example.com "),
    ).toEqual(["writer@example.com", "editor@example.com"]);
  });

  test("only accepts a signed-in primary email on the allowlist", () => {
    const input = { adminEmails: ["writer@example.com"], userId: "user_123" };
    expect(resolveSyncAccountAccess({ ...input, email: "WRITER@example.com" })).toBe("authorized");
    expect(resolveSyncAccountAccess({ ...input, email: "guest@example.com" })).toBe("unauthorized");
    expect(resolveSyncAccountAccess({ ...input, email: null, userId: null })).toBe("signed-out");
  });

  test("fails closed when no ADMIN_EMAILS value is configured", () => {
    expect(
      resolveSyncAccountAccess({
        adminEmails: [],
        email: "writer@example.com",
        userId: "user_123",
      }),
    ).toBe("unauthorized");
  });
});
