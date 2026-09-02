import { describe, expect, test } from "bun:test";
import { calculateReadingProgress } from "./reading-progress";

const chapters = [
  { id: "two", number: 2, wordCount: 900 },
  { id: "one", number: 1, wordCount: 300 },
] as never[];

describe("reading progress", () => {
  test("uses word-weighted progress rather than chapter count", () => {
    expect(calculateReadingProgress({ chapters, lastChapterId: "two", position: 0.5 })).toEqual({
      percent: 63,
      remainingMinutes: 2,
    });
  });

  test("keeps unread and empty books at a safe zero progress", () => {
    expect(calculateReadingProgress({ chapters, lastChapterId: undefined })).toEqual({
      percent: 0,
      remainingMinutes: 6,
    });
    expect(
      calculateReadingProgress({ chapters: [], lastChapterId: "missing", position: 1 }),
    ).toEqual({
      percent: 0,
      remainingMinutes: 0,
    });
  });
});
