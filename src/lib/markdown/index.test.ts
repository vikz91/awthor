import { describe, expect, test } from "bun:test";
import { countManuscript, generatedCoverVariant, sanitizeMarkdownUrl } from "./index";

describe("Markdown helpers", () => {
  test("counts words, source characters, and pages", () => {
    expect(countManuscript("# It's a two-word test.\n\nNext line.")).toEqual({
      wordCount: 6,
      pageCount: 1,
      characterCount: 28,
      characterCountWithSpaces: 35,
    });
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
});
