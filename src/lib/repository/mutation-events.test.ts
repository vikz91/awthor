import { describe, expect, test } from "bun:test";
import { readRepositoryMutation } from "./mutation-events";

describe("repository mutation events", () => {
  test("treats plain and invalid legacy events as deferred", () => {
    expect(readRepositoryMutation(new Event("awthor:repository-mutated"))).toEqual({
      syncPolicy: "deferred",
    });
    expect(
      readRepositoryMutation(
        new CustomEvent("awthor:repository-mutated", {
          detail: { syncPolicy: "eventually" },
        }),
      ),
    ).toEqual({ syncPolicy: "deferred" });
    expect(
      readRepositoryMutation(
        new CustomEvent("awthor:repository-mutated", {
          detail: { reason: 42, syncPolicy: "immediate" },
        }),
      ),
    ).toEqual({ syncPolicy: "deferred" });
  });

  test("returns a valid typed mutation detail", () => {
    expect(
      readRepositoryMutation(
        new CustomEvent("awthor:repository-mutated", {
          detail: { reason: "reading-position", syncPolicy: "local-only" },
        }),
      ),
    ).toEqual({ reason: "reading-position", syncPolicy: "local-only" });
    expect(
      readRepositoryMutation(
        new CustomEvent("awthor:repository-mutated", {
          detail: { reason: "reading-position", syncPolicy: "progress" },
        }),
      ),
    ).toEqual({ reason: "reading-position", syncPolicy: "progress" });
  });
});
