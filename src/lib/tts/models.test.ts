import { describe, expect, test } from "bun:test";
import {
  detectLanguage,
  downloadEstimate,
  makePassages,
  preparationLabel,
  savedLanguage,
} from "./models";

describe("MMS language selection", () => {
  test("recognizes all five scripts and saved language names/codes", () => {
    for (const [text, language] of [
      ["Hello world", "en"],
      ["বাংলা গল্প", "bn"],
      ["தமிழ் கதை", "ta"],
      ["ಕನ್ನಡ ಕಥೆ", "kn"],
      ["हिन्दी कहानी", "hi"],
    ] as const) {
      expect(detectLanguage(text)).toBe(language);
    }
    expect(savedLanguage("bn-IN")).toBe("bn");
    expect(savedLanguage(" Tamil ")).toBe("ta");
    expect(savedLanguage("বাংলা")).toBe("bn");
  });
  test("handles the historical English default, mixed passages and explicit overrides", () => {
    expect(makePassages("বাংলা গল্প।", "English", "auto")[0].language).toBe("bn");
    expect(makePassages("Hello. हिन्दी कहानी।", "Hindi", "auto").map((p) => p.language)).toEqual([
      "en",
      "hi",
    ]);
    expect(makePassages("Ami banglay golpo boli.", "Bengali", "bn")[0].language).toBe("bn");
    expect(makePassages("12345", "Tamil", "auto")[0].language).toBe("ta");
    expect(() => makePassages("Bonjour", "French", "auto")).toThrow("not supported");
    expect(makePassages("Bonjour", "French", "en")[0].language).toBe("en");
  });
  test("splits danda and long passages without dropping text", () => {
    expect(makePassages("पहला वाक्य। दूसरा वाक्य॥", "Hindi", "auto")).toHaveLength(2);
    const input = "hello ".repeat(200).trim();
    const passages = makePassages(input, "English", "auto");
    expect(passages.every((p) => p.text.length <= 220)).toBe(true);
    expect(passages.map((p) => p.text).join(" ")).toBe(input);
    expect(makePassages("... \n", "English", "auto")).toEqual([]);
  });
});

test("download ETA needs a real sample and does not invent inference timing", () => {
  expect(downloadEstimate(0, 0, 0)).toEqual({});
  expect(downloadEstimate(25, 100, 500)).toEqual({ percent: 25, seconds: undefined });
  expect(downloadEstimate(25, 100, 2000)).toEqual({ percent: 25, seconds: 6 });
  expect(downloadEstimate(100, 100, 2000).seconds).toBeUndefined();
  expect(preparationLabel({})).toBe("Preparing…");
  expect(preparationLabel({ percent: 25, seconds: 6 })).toBe("Preparing · 25% · ~6s left…");
});
