import { describe, expect, test } from "bun:test";
import { fillMissingProfileEmail } from "./profile";

describe("Clerk profile email adoption", () => {
  test("fills an empty local author email from the signed-in Clerk account", () => {
    expect(fillMissingProfileEmail(null, "writer@example.com")).toMatchObject({
      authorName: "",
      contactEmail: "writer@example.com",
    });
  });

  test("never overwrites an existing local author email", () => {
    const profile = {
      authorName: "N. Writer",
      contactEmail: "pen-name@example.com",
      defaultProofreadingDialect: "american" as const,
      theme: "paper" as const,
      website: "",
    };

    expect(fillMissingProfileEmail(profile, "clerk@example.com")).toBe(profile);
  });

  test("does not create or change a profile without a Clerk email", () => {
    expect(fillMissingProfileEmail(null, null)).toBeNull();
  });
});
