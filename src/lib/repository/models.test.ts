import { describe, expect, test } from "bun:test";
import { generatedBookCoverDataUrlPrefix } from "@/lib/book-cover-generator";
import { appSettingsSchema, bookSchema, createDefaultAppSettings } from "./models";

describe("app settings", () => {
  test("defaults new and existing editor settings to seamless layout", () => {
    expect(createDefaultAppSettings().editor.layout).toBe("seamless");
    expect(appSettingsSchema.parse({ editor: {} }).editor.layout).toBe("seamless");
  });

  test("preserves the pages preference", () => {
    expect(appSettingsSchema.parse({ editor: { layout: "pages" } }).editor.layout).toBe("pages");
  });
});

function bookWithCover(coverUrl: string) {
  return {
    id: "book-1",
    title: "The Missing Page",
    author: "Mira Sen",
    coverUrl,
    createdAt: "2026-09-03T00:00:00.000Z",
    updatedAt: "2026-09-03T00:00:00.000Z",
  };
}

describe("book cover URL", () => {
  test("accepts generated JPEG covers and existing HTTP covers", () => {
    const generated = `${generatedBookCoverDataUrlPrefix}AQIDBA==`;

    expect(bookSchema.parse(bookWithCover(generated)).coverUrl).toBe(generated);
    expect(bookSchema.parse(bookWithCover("https://example.com/cover.jpg")).coverUrl).toBe(
      "https://example.com/cover.jpg",
    );
  });

  test("rejects executable and non-raster embedded data", () => {
    expect(() => bookSchema.parse(bookWithCover("data:image/svg+xml;base64,PHN2Zz4="))).toThrow();
    expect(() => bookSchema.parse(bookWithCover("javascript:alert(1)"))).toThrow();
  });
});
