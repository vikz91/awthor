import { describe, expect, test } from "bun:test";
import { createSeedRepositoryData } from "@/lib/repository";
import { buildPublishedStory, toPublishedStorySummary } from "./published-story-snapshot";

describe("published story snapshots", () => {
  test("preserves a stable public ID and sorts a Markdown chapter snapshot", () => {
    const data = createSeedRepositoryData();
    const book = data.books[0];
    const reversed = [...data.chapters[book.id]].reverse();

    const story = buildPublishedStory({
      authorEmail: "writer@example.com",
      authorName: "A. Writer",
      book,
      chapters: reversed,
      existingPublishedAt: "2026-01-01T00:00:00.000Z",
      now: "2026-02-01T00:00:00.000Z",
      publicId: "a".repeat(32),
      userId: "user_123",
    });

    expect(story.publicId).toBe("a".repeat(32));
    expect(story.publishedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(story.updatedAt).toBe("2026-02-01T00:00:00.000Z");
    expect(story.chapters.map((chapter) => chapter.number)).toEqual(
      [...story.chapters].map((chapter) => chapter.number).sort((left, right) => left - right),
    );
    expect(story.authorEmail).toBe("writer@example.com");
    expect(toPublishedStorySummary(story)).toEqual({
      publicId: "a".repeat(32),
      publishedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
      url: `/stories/${"a".repeat(32)}`,
    });
  });

  test("omits an invalid author email instead of blocking publication", () => {
    const data = createSeedRepositoryData();
    const book = data.books[0];
    const story = buildPublishedStory({
      authorEmail: "not an email",
      authorName: "A. Writer",
      book,
      chapters: data.chapters[book.id],
      now: "2026-02-01T00:00:00.000Z",
      publicId: "b".repeat(32),
      userId: "user_123",
    });

    expect(story.authorEmail).toBe("");
  });
});
