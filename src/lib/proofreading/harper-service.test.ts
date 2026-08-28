import { describe, expect, test } from "bun:test";
import { HarperProofreadingService } from "./harper-service";

function fakeLinter() {
  const suggestion = {
    kind: () => 0,
    get_replacement_text: () => "the",
  };
  const lint = {
    span: () => ({ start: 0, end: 3 }),
    lint_kind_pretty: () => "Spelling",
    lint_kind: () => "Spelling",
    message: () => "Did you mean “the”?",
    get_problem_text: () => "teh",
    suggestions: () => [suggestion],
  };

  return {
    languages: [] as string[],
    async setup() {},
    async lint(_text: string, options: { language: string }) {
      this.languages.push(options.language);
      return [lint];
    },
    async applySuggestion(text: string) {
      return text.replace("teh", "the");
    },
    async ignoreLint() {},
    async dispose() {},
  };
}

describe("Harper proofreading adapter", () => {
  test("checks Markdown, rejects stale suggestions, applies current suggestions, and ignores", async () => {
    const linter = fakeLinter();
    const service = new HarperProofreadingService({
      linterFactory: async () => linter as never,
    });
    const [issue] = await service.check("teh draft", { format: "markdown" });
    expect(linter.languages).toEqual(["markdown"]);
    await expect(
      service.applySuggestion("changed draft", issue.id, issue.suggestions[0].id),
    ).rejects.toThrow("document changed");
    expect(await service.applySuggestion("teh draft", issue.id, issue.suggestions[0].id)).toBe(
      "the draft",
    );

    const [nextIssue] = await service.check("teh again", { format: "markdown" });
    await service.ignoreIssue(nextIssue.id);
    await expect(service.ignoreIssue(nextIssue.id)).rejects.toThrow("stale");
  });

  test("recovers from an initialization failure and discards an aborted check", async () => {
    const linter = fakeLinter();
    let attempts = 0;
    const service = new HarperProofreadingService({
      linterFactory: async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("offline");
        }
        return linter as never;
      },
    });

    await expect(service.initialize()).rejects.toThrow("offline");
    await service.initialize();
    const controller = new AbortController();
    controller.abort();
    expect(await service.check("teh", { format: "markdown", signal: controller.signal })).toEqual(
      [],
    );
  });
});
