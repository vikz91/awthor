import { describe, expect, test } from "bun:test";
import { assertRemoteWritesAccepted, RemoteWorkspaceError } from "./remote-workspace-conflicts";
import {
  createRemoteBookWithInitialChapter,
  remoteCreateBookSchema,
  remoteCreateCharacterSchema,
} from "./remote-workspace-inputs";

describe("remote workspace input and defaults", () => {
  test("creates a book with one empty initial Markdown chapter", () => {
    const { book, initialChapter } = createRemoteBookWithInitialChapter({
      author: "A. Writer",
      genre: "  Mystery, Romance, mystery  ",
      seriesName: "Stories",
      title: "A new story",
    });

    expect(book.chapterCount).toBe(1);
    expect(book.genre).toBe("Mystery, Romance");
    expect(book.isPartOfSeries).toBe(true);
    expect(initialChapter.number).toBe(1);
    expect(initialChapter.body).toBe("");
  });

  test("accepts only HTTP(S) covers and bounded character fields", () => {
    expect(
      remoteCreateBookSchema.safeParse({ coverUrl: "ftp://example.com/a", title: "Book" }).success,
    ).toBe(false);
    expect(remoteCreateCharacterSchema.safeParse({ name: "Elara", unexpected: true }).success).toBe(
      false,
    );
  });

  test("reports an LWW-rejected write instead of treating it as saved", () => {
    const submitted = {
      contentHash: "",
      deleted: false,
      deviceId: "remote-mcp",
      modifiedAt: "2026-08-31T00:00:00.000Z",
      payload: "paper",
      recordId: "theme",
      recordType: "theme" as const,
    };
    const canonical = {
      ...submitted,
      deviceId: "newer-device",
      modifiedAt: "2026-09-01T00:00:00.000Z",
      serverRevision: 42,
    };

    try {
      assertRemoteWritesAccepted([submitted], [canonical]);
      throw new Error("Expected a write conflict");
    } catch (error) {
      expect(error).toBeInstanceOf(RemoteWorkspaceError);
      expect((error as RemoteWorkspaceError).code).toBe("WRITE_CONFLICT");
      expect((error as RemoteWorkspaceError).canonicalRecords).toEqual([canonical]);
    }
  });
});
