import { describe, expect, test } from "bun:test";
import { markdownToPdfBlocks } from "./book-pdf";

describe("book PDF content", () => {
  test("turns core Markdown blocks into readable PDF text", () => {
    expect(
      markdownToPdfBlocks(
        "# A heading\n\nA **paragraph** with [a link](https://example.com).\n\n> A quote\n\n- One\n\n```\nconst draft = true;\n```",
      ),
    ).toEqual([
      { kind: "heading", text: "A heading" },
      { kind: "paragraph", text: "A paragraph with a link." },
      { kind: "quote", text: "A quote" },
      { kind: "list", text: "One" },
      { kind: "code", text: "const draft = true;" },
    ]);
  });
});
