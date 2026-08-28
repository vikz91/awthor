import { describe, expect, test } from "bun:test";
import { createSeedRepositoryData, seedRepositorySummary } from "./seed-data";

describe("seed repository data", () => {
  test("provides two complete books with three fully described chapters each", () => {
    const data = createSeedRepositoryData();

    expect(data.books).toHaveLength(2);
    expect(seedRepositorySummary).toEqual({ authors: 1, books: 2, chapters: 6, characters: 4 });
    expect(data.settings.backupReminder).toEqual({
      enabled: true,
      frequency: "weekly",
      lastShownAt: "2026-08-20T09:30:00.000Z",
    });

    for (const book of data.books) {
      const chapters = data.chapters[book.id];
      expect(chapters).toHaveLength(3);
      expect(book).toMatchObject({
        author: "Alex Parker",
        chapterCount: 3,
        language: "English",
      });
      expect(book.coverUrl).toStartWith("https://");
      expect(book.subtitle.length).toBeGreaterThan(0);
      expect(book.genre.length).toBeGreaterThan(0);
      expect(book.subgenre.length).toBeGreaterThan(0);
      expect(book.preface.length).toBeGreaterThan(0);
      expect(book.synopsis.length).toBeGreaterThan(0);
      expect(book.wordCount).toBe(
        chapters.reduce((total, chapter) => total + chapter.wordCount, 0),
      );
      expect(book.characterCount).toBe(
        chapters.reduce((total, chapter) => total + chapter.characterCount, 0),
      );
      expect(book.characterCountWithSpaces).toBe(
        chapters.reduce((total, chapter) => total + chapter.characterCountWithSpaces, 0),
      );

      for (const [index, chapter] of chapters.entries()) {
        expect(chapter.number).toBe(index + 1);
        expect(chapter.body).toStartWith(`# ${chapter.title}`);
        expect(chapter.summary.length).toBeGreaterThan(0);
        expect(chapter.pov.length).toBeGreaterThan(0);
        expect(chapter.wordCount).toBeGreaterThan(0);
        expect(chapter.arc.goal.length).toBeGreaterThan(0);
        expect(chapter.arc.conflict.length).toBeGreaterThan(0);
        expect(chapter.arc.outcome.length).toBeGreaterThan(0);
      }

      expect(data.settings.lastChapterByBook[book.id]).toBeDefined();
      expect(data.settings.readingPositionByBook[book.id]).toBeDefined();
      expect(data.settings.proofreadingByBook[book.id]).toBeDefined();
      expect(data.characters[book.id]).toHaveLength(2);
      for (const character of data.characters[book.id]) {
        expect(character.image).toStartWith("https://");
        expect(character.dob.length).toBeGreaterThan(0);
        expect(character.location.length).toBeGreaterThan(0);
        expect(character.language.length).toBeGreaterThan(0);
        expect(character.physicalDescription.length).toBeGreaterThan(0);
        expect(character.mentalDescription.length).toBeGreaterThan(0);
        expect(character.characteristics.length).toBeGreaterThan(0);
        expect(character.storyRole.length).toBeGreaterThan(0);
        expect(character.relationships.length).toBeGreaterThan(0);
        expect(character.arc.length).toBeGreaterThan(0);
      }
    }
  });
});
