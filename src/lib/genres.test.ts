import { describe, expect, test } from "bun:test";
import {
  hasOpenGenreCsvQuote,
  mergeGenres,
  normalizeGenreCsv,
  parseGenreCsv,
  serializeGenreCsv,
} from "./genres";

describe("book genre CSV", () => {
  test("parses comma and newline separated genres without case-insensitive duplicates", () => {
    expect(parseGenreCsv(" Mystery, Romance\nFantasy, mystery ")).toEqual([
      "Mystery",
      "Romance",
      "Fantasy",
    ]);
  });

  test("round-trips quoted commas and escaped quotes", () => {
    const genres = ["Crime, noir", 'Children\'s "adventure"', "Fantasy"];
    const csv = serializeGenreCsv(genres);

    expect(csv).toBe('"Crime, noir", "Children\'s ""adventure""", Fantasy');
    expect(parseGenreCsv(csv)).toEqual(genres);
  });

  test("normalizes and merges legacy and pasted values", () => {
    expect(normalizeGenreCsv(" Mystery ,Romance,MYSTERY ")).toBe("Mystery, Romance");
    expect(mergeGenres(["Mystery"], ["romance", "MYSTERY"])).toEqual(["Mystery", "romance"]);
  });

  test("tracks whether a typed comma is inside a quoted CSV field", () => {
    expect(hasOpenGenreCsvQuote('"Crime,')).toBe(true);
    expect(hasOpenGenreCsvQuote('"Crime, noir"')).toBe(false);
  });
});
