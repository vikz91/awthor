import { describe, expect, test } from "bun:test";
import { createBookMarkdown, createPdfDocumentTitle, createPdfFilename } from "./book-export";
import type { Book, Chapter } from "./repository";

const now = "2026-08-28T00:00:00.000Z";

const book: Book = {
  author: "A. Writer",
  chapterCount: 2,
  characterCount: 0,
  characterCountWithSpaces: 0,
  coverUrl: null,
  createdAt: now,
  genre: "",
  id: "book-1",
  isPartOfSeries: false,
  language: "English",
  pageCount: 0,
  preface: "A short beginning.",
  seriesName: "",
  seriesPosition: null,
  slug: "the-draft",
  status: "First draft",
  subgenre: "",
  subtitle: "A novel",
  synopsis: "",
  title: "The Draft",
  updatedAt: now,
  wordCount: 0,
};

function chapter(number: number, title: string, body: string): Chapter {
  return {
    arc: { conflict: "", goal: "", outcome: "", stage: "Unassigned", tension: 3 },
    body,
    characterCount: 0,
    characterCountWithSpaces: 0,
    createdAt: now,
    id: `chapter-${number}`,
    number,
    pov: "",
    status: "Draft",
    summary: "",
    title,
    updatedAt: now,
    wordCount: 0,
  };
}

describe("book export", () => {
  test("combines title matter, preface, and chapters without duplicate chapter headings", () => {
    const markdown = createBookMarkdown({
      book,
      chapters: [
        chapter(1, "Arrival", "# Old title\n\nThe train arrived."),
        chapter(2, "Departure", "The platform emptied."),
      ],
    });

    expect(markdown).toBe(
      "# The Draft\n\n_A novel_\n\n*By A. Writer*\n\n---\n\n## Preface\n\nA short beginning.\n\n---\n\n# Arrival\n\nThe train arrived.\n\n---\n\n# Departure\n\nThe platform emptied.\n",
    );
    expect(markdown).not.toContain("Old title");
  });

  test("creates a filesystem-friendly PDF document title", () => {
    expect(createPdfDocumentTitle({ ...book, title: "Draft: Part / One" })).toBe(
      "Draft- Part - One — Awthor",
    );
    expect(createPdfFilename({ ...book, title: "Draft: Part / One" })).toBe(
      "Draft- Part - One.pdf",
    );
  });
});
