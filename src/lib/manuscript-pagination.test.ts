import { describe, expect, test } from "bun:test";
import { groupBlocksIntoPages } from "./manuscript-pagination";

describe("manuscript pagination", () => {
  test("groups manuscript blocks without exceeding the available page height", () => {
    expect(groupBlocksIntoPages([180, 260, 420, 120], 700)).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  test("keeps an oversized block isolated so later content starts on a fresh page", () => {
    expect(groupBlocksIntoPages([120, 900, 180], 700)).toEqual([[0], [1], [2]]);
  });

  test("does not paginate until a measurable page height is available", () => {
    expect(groupBlocksIntoPages([120, 180], 0)).toEqual([]);
  });
});
