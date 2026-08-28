import { describe, expect, test } from "bun:test";
import { calculateRailMetrics } from "./chapter-progress-rail";

describe("chapter progress rail", () => {
  test("stays hidden when a chapter fits in one reading viewport", () => {
    expect(calculateRailMetrics(120, 500, 900)).toBeNull();
  });

  test("maps a long chapter to viewport-sized clickable positions", () => {
    expect(calculateRailMetrics(120, 2_400, 1_000)).toEqual({
      start: 24,
      end: 1_616,
      markerCount: 4,
      totalPages: 4,
    });
  });

  test("caps visual markers without losing the full reading-page count", () => {
    expect(calculateRailMetrics(80, 10_000, 800)).toMatchObject({
      markerCount: 9,
      totalPages: 18,
    });
  });
});
