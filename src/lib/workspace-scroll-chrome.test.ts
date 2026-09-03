import { describe, expect, test } from "bun:test";
import {
  isReadingChromeEdge,
  isSuddenReadingScroll,
  readingChromeStartDistance,
} from "./workspace-scroll-chrome";

describe("responsive reading chrome", () => {
  test("stays visible at the beginning of a chapter", () => {
    expect(
      isReadingChromeEdge({
        scrollHeight: 4_000,
        scrollTop: readingChromeStartDistance,
        viewportHeight: 800,
      }),
    ).toBe(true);
  });

  test("hides while reading through the middle", () => {
    expect(
      isReadingChromeEdge({
        scrollHeight: 4_000,
        scrollTop: 1_000,
        viewportHeight: 800,
      }),
    ).toBe(false);
  });

  test("returns within the final viewport", () => {
    expect(
      isReadingChromeEdge({
        scrollHeight: 4_000,
        scrollTop: 2_400,
        viewportHeight: 800,
      }),
    ).toBe(true);
  });

  test("remains visible when the chapter does not scroll", () => {
    expect(
      isReadingChromeEdge({
        scrollHeight: 700,
        scrollTop: 0,
        viewportHeight: 800,
      }),
    ).toBe(true);
  });

  test("treats a quick flick as reveal intent", () => {
    expect(isSuddenReadingScroll({ distance: 18, elapsedMs: 16 })).toBe(true);
    expect(isSuddenReadingScroll({ distance: -18, elapsedMs: 16 })).toBe(true);
  });

  test("does not interrupt a slow reading scroll", () => {
    expect(isSuddenReadingScroll({ distance: 5, elapsedMs: 16 })).toBe(false);
    expect(isSuddenReadingScroll({ distance: 18, elapsedMs: 80 })).toBe(false);
  });

  test("recognizes a large jump even when scroll events are sparse", () => {
    expect(isSuddenReadingScroll({ distance: 48, elapsedMs: 180 })).toBe(true);
  });
});
