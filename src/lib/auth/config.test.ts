import { describe, expect, test } from "bun:test";
import { resolveClerkConfiguration } from "./config";
import { getSyncAccountPresentation } from "./presentation";

describe("optional Clerk configuration", () => {
  test("stays disabled until both Clerk keys are configured", () => {
    expect(resolveClerkConfiguration({})).toEqual({
      adminEmails: [],
      enabled: false,
      publishableKey: null,
    });
    expect(
      resolveClerkConfiguration({ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example" }),
    ).toEqual({ adminEmails: [], enabled: false, publishableKey: "pk_test_example" });
    expect(resolveClerkConfiguration({ CLERK_SECRET_KEY: "sk_test_example" })).toEqual({
      adminEmails: [],
      enabled: false,
      publishableKey: null,
    });
  });

  test("enables Clerk only with non-empty public and secret keys", () => {
    expect(
      resolveClerkConfiguration({
        ADMIN_EMAILS: "writer@example.com",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: " pk_test_example ",
        CLERK_SECRET_KEY: " sk_test_example ",
      }),
    ).toEqual({
      adminEmails: ["writer@example.com"],
      enabled: true,
      publishableKey: "pk_test_example",
    });
  });
});

describe("sync account presentation", () => {
  test("keeps unconfigured deployments explicitly local-only", () => {
    expect(getSyncAccountPresentation({ configured: false, signedIn: false })).toMatchObject({
      actionLabel: "Sync unavailable",
      statusLabel: "Local-only",
    });
  });

  test("distinguishes a guest account prompt from a signed-in sync action", () => {
    expect(getSyncAccountPresentation({ configured: true, signedIn: false })).toMatchObject({
      actionLabel: "Enable sync",
      statusLabel: "Local-only",
    });
    expect(getSyncAccountPresentation({ configured: true, signedIn: true })).toMatchObject({
      actionLabel: "Sync now",
      statusLabel: "Ready to sync",
    });
  });
});
