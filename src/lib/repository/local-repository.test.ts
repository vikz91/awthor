import { describe, expect, test } from "bun:test";
import { awthorBackupFormat } from "./contract";
import {
  createLocalAwthorRepository,
  legacyRepositoryPrefix,
  repositoryPrefix,
  type StorageLike,
} from "./local-repository";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  failNextSetFor: string | null = null;

  get length(): number {
    return this.values.size;
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.failNextSetFor === key) {
      this.failNextSetFor = null;
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    }
    this.values.set(key, value);
  }
}

function v1Stored(payload: unknown): string {
  return JSON.stringify({ schemaVersion: 1, savedAt: "2026-08-28T00:00:00.000Z", payload });
}

function legacyEntries(): Record<string, string> {
  const book = {
    id: "legacy-book",
    slug: "legacy-book",
    title: "Legacy Book",
    author: "A. Writer",
    chapterCount: 1,
    pageCount: 1,
    wordCount: 2,
    characterCount: 10,
    characterCountWithSpaces: 11,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
  const scope = encodeURIComponent(book.id);

  return {
    "awthor-theme": "light",
    [`${legacyRepositoryPrefix}:books`]: v1Stored([book]),
    [`${legacyRepositoryPrefix}:chapters:${scope}`]: v1Stored([
      {
        id: "legacy-chapter",
        bookId: book.id,
        number: 1,
        title: "The old draft",
        status: "Draft",
        content: "Hello old world",
        wordCount: 3,
        characterCount: 13,
        characterCountWithSpaces: 15,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    ]),
    [`${legacyRepositoryPrefix}:characters:${scope}`]: v1Stored([]),
    [`${legacyRepositoryPrefix}:notes:${scope}`]: v1Stored([{ id: "note-1" }]),
    [`${legacyRepositoryPrefix}:plots:${scope}`]: v1Stored([{ id: "plot-1" }, { id: "plot-2" }]),
  };
}

function storageWith(entries: Record<string, string>): MemoryStorage {
  const storage = new MemoryStorage();
  for (const [key, value] of Object.entries(entries)) {
    storage.setItem(key, value);
  }
  return storage;
}

describe("local repository v2", () => {
  test("migrates supported data, defaults chapter arcs, then deletes v1 notes and plots", async () => {
    const storage = storageWith(legacyEntries());
    const repository = createLocalAwthorRepository(() => storage);

    const result = await repository.initialize();
    expect(result).toMatchObject({
      status: "migrated",
      discarded: { notes: 1, plots: 2 },
    });
    expect([...storage.values.keys()].some((key) => key.startsWith(legacyRepositoryPrefix))).toBe(
      false,
    );
    expect(storage.getItem(`${repositoryPrefix}:books`)).not.toBeNull();
    expect(await repository.theme.get()).toBe("paper");

    const chapters = await repository.chapters.list("legacy-book");
    expect(chapters?.[0]).toMatchObject({
      body: "Hello old world",
      arc: { stage: "Unassigned", tension: 3, goal: "", conflict: "", outcome: "" },
    });
  });

  test("rolls back partial v2 writes, leaves every v1 key, and can retry", async () => {
    const entries = legacyEntries();
    const storage = storageWith(entries);
    storage.failNextSetFor = `${repositoryPrefix}:books`;
    const repository = createLocalAwthorRepository(() => storage);

    const failed = await repository.initialize();
    expect(failed.status).toBe("failed");
    expect(failed.retryable).toBe(true);
    for (const [key, value] of Object.entries(entries)) {
      expect(storage.getItem(key)).toBe(value);
    }
    expect(storage.getItem(`${repositoryPrefix}:books`)).toBeNull();

    const retried = await repository.retryMigration();
    expect(retried.status).toBe("migrated");
    expect(storage.getItem(`${legacyRepositoryPrefix}:books`)).toBeNull();
  });

  test("imports a v1 backup and reports retired data as discarded", async () => {
    const storage = new MemoryStorage();
    const repository = createLocalAwthorRepository(() => storage);
    const result = await repository.importBackup({
      format: awthorBackupFormat,
      version: 1,
      exportedAt: "2026-08-28T00:00:00.000Z",
      entries: legacyEntries(),
    });

    expect(result).toEqual({ importedVersion: 1, discarded: { notes: 1, plots: 2 } });
    expect((await repository.getData()).books[0].id).toBe("legacy-book");
    expect([...storage.values.keys()].some((key) => key.includes(":notes:"))).toBe(false);
  });

  test("creates a book and chapter, persists Markdown, and repairs aggregates", async () => {
    const storage = new MemoryStorage();
    const repository = createLocalAwthorRepository(() => storage);
    const book = await repository.createBook({ title: "North Star", author: "A. Writer" });
    const chapters = await repository.chapters.list(book.id);
    expect(chapters).toHaveLength(1);

    const saved = await repository.saveManuscript(
      book.id,
      chapters?.[0].id ?? "missing",
      "# Hello\n\nTwo worlds meet.",
    );
    expect(saved.chapter.wordCount).toBe(4);
    expect(saved.book).toMatchObject({ chapterCount: 1, pageCount: 1, wordCount: 4 });

    const backup = await repository.exportBackup();
    expect(backup.version).toBe(2);
    expect(backup.data.books[0].id).toBe(book.id);
  });

  test("serializes settings writes with manuscript snapshot mutations", async () => {
    const storage = new MemoryStorage();
    const repository = createLocalAwthorRepository(() => storage);
    const book = await repository.createBook({ title: "Concurrent", author: "A. Writer" });
    const chapter = (await repository.chapters.list(book.id))?.[0];
    const settings = await repository.settings.get();
    if (!settings) {
      throw new Error("Expected settings after creating a book.");
    }

    const manuscriptSave = repository.saveManuscript(
      book.id,
      chapter?.id ?? "missing",
      "# A changed draft",
    );
    await Promise.resolve();
    const settingsSave = repository.settings.save({
      ...settings,
      readingPositionByBook: {
        ...settings?.readingPositionByBook,
        [book.id]: 0.72,
      },
    });

    await Promise.all([manuscriptSave, settingsSave]);
    expect((await repository.settings.get())?.readingPositionByBook[book.id]).toBe(0.72);
    expect((await repository.chapters.list(book.id))?.[0].body).toBe("# A changed draft");
  });

  test("protects the final chapter and cleans scoped state when deleting a book", async () => {
    const storage = new MemoryStorage();
    const repository = createLocalAwthorRepository(() => storage);
    const book = await repository.createBook({ title: "Only", author: "Writer" });
    const chapter = (await repository.chapters.list(book.id))?.[0];

    await expect(repository.deleteChapter(book.id, chapter?.id ?? "missing")).rejects.toThrow(
      "at least one chapter",
    );
    await repository.deleteBook(book.id);
    expect((await repository.books.get()) ?? []).toEqual([]);
    expect(
      storage.getItem(`${repositoryPrefix}:chapters:${encodeURIComponent(book.id)}`),
    ).toBeNull();
  });
});
