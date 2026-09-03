import { describe, expect, test } from "bun:test";
import {
  createBookCoverDesign,
  generatedBookCoverDataUrlPrefix,
  isGeneratedBookCoverDataUrl,
  sanitizeBookCoverUrl,
  wrapBookCoverText,
} from "./book-cover-generator";

describe("book cover generator", () => {
  test("selects a stable design from normalized book metadata", () => {
    const first = createBookCoverDesign({
      title: "  The   Missing Page ",
      author: " Mira  Sen ",
      genre: " Mystery ",
    });
    const second = createBookCoverDesign({
      title: "The Missing Page",
      author: "Mira Sen",
      genre: "Mystery",
    });

    expect(first).toEqual(second);
    expect(first.paletteIndex).toBeGreaterThanOrEqual(0);
    expect(first.paletteIndex).toBeLessThan(6);
    expect(["orbits", "rays", "arches", "lines"]).toContain(first.pattern);
  });

  test("uses a generation variation to select fresh color and pattern combinations", () => {
    const input = { title: "The Missing Page", author: "Mira Sen", genre: "Mystery" };
    const designs = new Set(
      Array.from({ length: 24 }, (_, index) => {
        const design = createBookCoverDesign({ ...input, variation: String(index) });
        return `${design.paletteIndex}:${design.pattern}`;
      }),
    );

    expect(designs.size).toBeGreaterThan(1);
  });

  test("wraps text without splitting Unicode characters", () => {
    const measuredLength = (value: string) => Array.from(value).length;

    expect(wrapBookCoverText("A quiet room", 7, measuredLength, 3)).toEqual({
      lines: ["A quiet", "room"],
      truncated: false,
    });
    expect(wrapBookCoverText("🌙🌙🌙🌙", 2, measuredLength, 1)).toEqual({
      lines: ["🌙…"],
      truncated: true,
    });
  });

  test("accepts only bounded generated JPEG or remote cover URLs", () => {
    const generated = `${generatedBookCoverDataUrlPrefix}AQIDBA==`;

    expect(isGeneratedBookCoverDataUrl(generated)).toBe(true);
    expect(sanitizeBookCoverUrl(generated)).toBe(generated);
    expect(sanitizeBookCoverUrl("https://example.com/cover.jpg")).toBe(
      "https://example.com/cover.jpg",
    );
    expect(sanitizeBookCoverUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
    expect(sanitizeBookCoverUrl("javascript:alert(1)")).toBeNull();
    expect(isGeneratedBookCoverDataUrl(generatedBookCoverDataUrlPrefix)).toBe(false);
  });
});
