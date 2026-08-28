import { describe, expect, test } from "bun:test";
import {
  countManuscript,
  formatMarkdownSelection,
  generatedCoverVariant,
  getLeadingMarkdownTitle,
  sanitizeMarkdownUrl,
  withLeadingMarkdownTitle,
  withoutLeadingMarkdownTitle,
} from "./index";

describe("Markdown helpers", () => {
  test("counts words, source characters, and pages", () => {
    expect(countManuscript("# It's a two-word test.\n\nNext line.")).toEqual({
      wordCount: 6,
      pageCount: 1,
      characterCount: 28,
      characterCountWithSpaces: 35,
    });
  });

  test("reads, removes, inserts, and replaces a leading Markdown title", () => {
    const manuscript = "# The Old Door\n\nThe hallway waited.";
    expect(getLeadingMarkdownTitle(manuscript)).toBe("The Old Door");
    expect(withoutLeadingMarkdownTitle(manuscript)).toBe("The hallway waited.");
    expect(withLeadingMarkdownTitle(manuscript, "The New Door")).toBe(
      "# The New Door\n\nThe hallway waited.",
    );
    expect(withLeadingMarkdownTitle("The hallway waited.", "  ")).toBe(
      "# Untitled chapter\n\nThe hallway waited.",
    );
  });

  test("allows intended protocols and rejects executable or embedded media", () => {
    expect(sanitizeMarkdownUrl("https://example.com/a.png", "image")).toBe(
      "https://example.com/a.png",
    );
    expect(sanitizeMarkdownUrl("/books/one", "link")).toBe("/books/one");
    expect(sanitizeMarkdownUrl("chapter-two.md", "link")).toBe("chapter-two.md");
    expect(sanitizeMarkdownUrl("./assets/map", "link")).toBe("./assets/map");
    expect(sanitizeMarkdownUrl("../index", "link")).toBe("../index");
    expect(sanitizeMarkdownUrl("mailto:author@example.com", "link")).toBe(
      "mailto:author@example.com",
    );
    expect(sanitizeMarkdownUrl("javascript:alert(1)", "link")).toBeNull();
    expect(sanitizeMarkdownUrl("//malicious.example/path", "link")).toBeNull();
    expect(sanitizeMarkdownUrl("..\\malicious", "link")).toBeNull();
    expect(sanitizeMarkdownUrl("chapter\u0000two", "link")).toBeNull();
    expect(sanitizeMarkdownUrl("data:image/png;base64,abc", "image")).toBeNull();
  });

  test("generates a stable bounded cover variant", () => {
    expect(generatedCoverVariant("book-1", 4)).toBe(generatedCoverVariant("book-1", 4));
    expect(generatedCoverVariant("book-1", 4)).toBeLessThan(4);
  });

  test("wraps and unwraps inline Markdown while preserving the inner selection", () => {
    const bold = formatMarkdownSelection("A quiet room.", 2, 7, "bold");
    expect(bold).toEqual({
      source: "A **quiet** room.",
      selectionStart: 4,
      selectionEnd: 9,
    });
    expect(
      formatMarkdownSelection(bold.source, bold.selectionStart - 2, bold.selectionEnd + 2, "bold"),
    ).toEqual({ source: "A quiet room.", selectionStart: 2, selectionEnd: 7 });
    expect(
      formatMarkdownSelection(bold.source, bold.selectionStart, bold.selectionEnd, "bold"),
    ).toEqual({ source: "A quiet room.", selectionStart: 2, selectionEnd: 7 });
    expect(formatMarkdownSelection("soft", 0, 4, "italic").source).toBe("*soft*");
    expect(formatMarkdownSelection("old", 0, 3, "strikethrough").source).toBe("~~old~~");
  });

  test("distinguishes italic toggles from adjacent bold markers", () => {
    expect(formatMarkdownSelection("**bold**", 2, 6, "italic")).toEqual({
      source: "***bold***",
      selectionStart: 3,
      selectionEnd: 7,
    });
    expect(formatMarkdownSelection("***bold***", 3, 7, "italic")).toEqual({
      source: "**bold**",
      selectionStart: 2,
      selectionEnd: 6,
    });
  });

  test("quotes complete selected lines and toggles the quote off", () => {
    const quoted = formatMarkdownSelection("First line\nSecond line\nThird", 13, 17, "quote");
    expect(quoted).toEqual({
      source: "First line\n> Second line\nThird",
      selectionStart: 11,
      selectionEnd: 24,
    });
    expect(
      formatMarkdownSelection(quoted.source, quoted.selectionStart, quoted.selectionEnd, "quote"),
    ).toEqual({
      source: "First line\nSecond line\nThird",
      selectionStart: 11,
      selectionEnd: 22,
    });
  });
});
