import { describe, expect, test } from "bun:test";
import { indexedDB } from "fake-indexeddb";
import {
  createIndexedDbAwthorRepository,
  type IndexedDbAwthorRepositoryOptions,
  indexedDbRepositoryPrefix,
} from "./indexeddb-repository";
import {
  createLocalAwthorRepository,
  legacyRepositoryPrefix,
  repositoryPrefix as localRepositoryPrefix,
  type StorageLike,
} from "./local-repository";
import { createSeedRepositoryData, unseedRepositoryData } from "./seed-data";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  failNextSetFor: string | null = null;

  get length(): number {
    return this.values.size;
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failNextSetFor === key) {
      this.failNextSetFor = null;
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    }
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }
}

let databaseSequence = 0;

type TestRepositoryOptions = IndexedDbAwthorRepositoryOptions & { databaseName: string };

function repositoryOptions(storage: MemoryStorage): TestRepositoryOptions {
  databaseSequence += 1;
  return {
    databaseName: `awthor-test-${databaseSequence}`,
    getIndexedDb: () => indexedDB,
    getStorage: () => storage,
  };
}

function parseEnvelope(storage: MemoryStorage, key: string): Record<string, unknown> {
  const raw = storage.getItem(key);
  if (!raw) {
    throw new Error(`Expected ${key} to be stored.`);
  }
  const envelope = JSON.parse(raw) as { payload: Record<string, unknown> };
  return envelope.payload;
}

function v1Stored(payload: unknown): string {
  return JSON.stringify({ schemaVersion: 1, savedAt: "2026-08-28T00:00:00.000Z", payload });
}

async function countDatabaseRecords(databaseName: string) {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
  const storeNames = ["books", "chapters", "characters", "bookSettings"] as const;
  const transaction = database.transaction(storeNames, "readonly");
  const counts = await Promise.all(
    storeNames.map(
      (storeName) =>
        new Promise<number>((resolve, reject) => {
          const request = transaction.objectStore(storeName).count();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
        }),
    ),
  );
  database.close();
  return Object.fromEntries(storeNames.map((storeName, index) => [storeName, counts[index]]));
}

describe("IndexedDB repository v3", () => {
  test("migrates the v2 localStorage repository and removes its large collection keys", async () => {
    const storage = new MemoryStorage();
    const localRepository = createLocalAwthorRepository(() => storage);
    await localRepository.initialize();
    await localRepository.profile.save({
      authorName: "A. Writer",
      contactEmail: "writer@example.com",
      defaultProofreadingDialect: "indian",
      theme: "stone",
      website: "https://example.com",
    });
    await localRepository.theme.save("stone");
    const book = await localRepository.createBook({ title: "North Star", author: "A. Writer" });
    const chapter = (await localRepository.chapters.list(book.id))?.[0];
    if (!chapter) {
      throw new Error("Expected a seeded chapter.");
    }
    await localRepository.saveManuscript(book.id, chapter.id, "# Arrival\n\nThe train stopped.");
    await localRepository.createCharacter(book.id, { name: "Mira" });
    const settings = await localRepository.settings.get();
    if (!settings) {
      throw new Error("Expected local settings.");
    }
    await localRepository.settings.save({
      ...settings,
      readingPositionByBook: { ...settings.readingPositionByBook, [book.id]: 0.45 },
      proofreadingByBook: {
        ...settings.proofreadingByBook,
        [book.id]: { dialect: "indian", words: ["pujo"] },
      },
    });

    const options = repositoryOptions(storage);
    const repository = createIndexedDbAwthorRepository(options);
    const migration = await repository.initialize();
    expect(migration.status).toBe("migrated");

    const data = await repository.getData();
    expect(data.theme).toBe("stone");
    expect(data.profile?.authorName).toBe("A. Writer");
    expect(data.books).toHaveLength(1);
    expect(data.chapters[book.id]?.[0]).toMatchObject({
      title: "Arrival",
      body: "# Arrival\n\nThe train stopped.",
    });
    expect(data.characters[book.id]?.[0]?.name).toBe("Mira");
    expect(data.settings.readingPositionByBook[book.id]).toBe(0.45);
    expect(data.settings.proofreadingByBook[book.id]).toEqual({
      dialect: "indian",
      words: ["pujo"],
    });

    expect(storage.getItem(`${localRepositoryPrefix}:books`)).toBeNull();
    expect(
      storage.getItem(`${localRepositoryPrefix}:chapters:${encodeURIComponent(book.id)}`),
    ).toBeNull();
    expect(storage.getItem(`${indexedDbRepositoryPrefix}:indexeddb-ready`)).toBe("ready");
    expect(parseEnvelope(storage, `${indexedDbRepositoryPrefix}:settings`)).not.toHaveProperty(
      "lastChapterByBook",
    );
  });

  test("removes intermediate v2 keys after migrating directly from v1", async () => {
    const storage = new MemoryStorage();
    const book = {
      id: "legacy-book",
      slug: "legacy-book",
      title: "Legacy Book",
      author: "A. Writer",
      chapterCount: 1,
      pageCount: 1,
      wordCount: 3,
      characterCount: 13,
      characterCountWithSpaces: 15,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    const scope = encodeURIComponent(book.id);
    storage.setItem(`${legacyRepositoryPrefix}:books`, v1Stored([book]));
    storage.setItem(
      `${legacyRepositoryPrefix}:chapters:${scope}`,
      v1Stored([
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
    );
    storage.setItem(`${legacyRepositoryPrefix}:characters:${scope}`, v1Stored([]));
    storage.setItem(`${legacyRepositoryPrefix}:notes:${scope}`, v1Stored([{ id: "note-1" }]));
    storage.setItem(`${legacyRepositoryPrefix}:plots:${scope}`, v1Stored([{ id: "plot-1" }]));

    const repository = createIndexedDbAwthorRepository(repositoryOptions(storage));
    const migration = await repository.initialize();

    expect(migration).toMatchObject({
      status: "migrated",
      discarded: { notes: 1, plots: 1 },
    });
    expect((await repository.books.get())?.[0]?.id).toBe(book.id);
    expect(
      [...storage.values.keys()].some(
        (key) =>
          key.startsWith(`${legacyRepositoryPrefix}:`) ||
          key.startsWith(`${localRepositoryPrefix}:`),
      ),
    ).toBe(false);
  });

  test("stores chapters individually and preserves book settings across repository instances", async () => {
    const storage = new MemoryStorage();
    const options = repositoryOptions(storage);
    const repository = createIndexedDbAwthorRepository(options);
    await repository.initialize();
    const book = await repository.createBook({ title: "Separate Chapters", author: "A. Writer" });
    const firstChapter = (await repository.chapters.list(book.id))?.[0];
    if (!firstChapter) {
      throw new Error("Expected the initial chapter.");
    }
    const secondChapter = await repository.createChapter(book.id, { title: "Second" });
    await repository.saveManuscript(
      book.id,
      firstChapter.id,
      "# First\n\nA locally saved manuscript.",
    );
    await repository.saveManuscript(book.id, secondChapter.id, "# Second\n\nAnother chapter.");

    const settings = await repository.settings.get();
    if (!settings) {
      throw new Error("Expected settings.");
    }
    await repository.settings.save({
      ...settings,
      lastChapterByBook: { ...settings.lastChapterByBook, [book.id]: secondChapter.id },
      readingPositionByBook: { ...settings.readingPositionByBook, [book.id]: 0.72 },
      proofreadingByBook: {
        ...settings.proofreadingByBook,
        [book.id]: { dialect: "british", words: ["colourway"] },
      },
    });

    expect([...storage.values.keys()].some((key) => key.includes(":books"))).toBe(false);
    expect([...storage.values.keys()].some((key) => key.includes(":chapters:"))).toBe(false);

    const reloaded = createIndexedDbAwthorRepository(options);
    await reloaded.initialize();
    const chapters = await reloaded.chapters.list(book.id);
    expect(chapters).toHaveLength(2);
    expect(chapters?.map((chapter) => chapter.body)).toEqual([
      "# First\n\nA locally saved manuscript.",
      "# Second\n\nAnother chapter.",
    ]);
    expect(await reloaded.settings.get()).toMatchObject({
      lastChapterByBook: { [book.id]: secondChapter.id },
      readingPositionByBook: { [book.id]: 0.72 },
      proofreadingByBook: {
        [book.id]: { dialect: "british", words: ["colourway"] },
      },
    });
  });

  test("persists the complete two-book fixture by record and unseeds every fixture record", async () => {
    const storage = new MemoryStorage();
    const options = repositoryOptions(storage);
    const repository = createIndexedDbAwthorRepository(options);
    await repository.initialize();
    await repository.replaceData(createSeedRepositoryData());

    const stored = await repository.getData();
    expect(stored.books).toHaveLength(2);
    expect(Object.values(stored.chapters).flat()).toHaveLength(6);
    expect(Object.values(stored.characters).flat()).toHaveLength(4);
    expect(await countDatabaseRecords(options.databaseName)).toEqual({
      books: 2,
      chapters: 6,
      characters: 4,
      bookSettings: 2,
    });
    expect([...storage.values.keys()].some((key) => key.includes(":books"))).toBe(false);
    expect([...storage.values.keys()].some((key) => key.includes(":chapters:"))).toBe(false);

    expect(await unseedRepositoryData(repository)).toBe(2);
    expect(await countDatabaseRecords(options.databaseName)).toEqual({
      books: 0,
      chapters: 0,
      characters: 0,
      bookSettings: 0,
    });
  });

  test("unseeds fixture books without deleting unrelated books", async () => {
    const storage = new MemoryStorage();
    const options = repositoryOptions(storage);
    const repository = createIndexedDbAwthorRepository(options);
    await repository.initialize();
    await repository.replaceData(createSeedRepositoryData());
    const personalBook = await repository.createBook({
      title: "My Private Draft",
      author: "A. Writer",
    });

    expect(await unseedRepositoryData(repository)).toBe(2);

    const stored = await repository.getData();
    expect(stored.books.map((book) => book.id)).toEqual([personalBook.id]);
    expect(stored.chapters[personalBook.id]).toHaveLength(1);
    expect(await countDatabaseRecords(options.databaseName)).toEqual({
      books: 1,
      chapters: 1,
      characters: 0,
      bookSettings: 1,
    });
  });

  test("keeps v2 data intact when migration fails and can retry", async () => {
    const storage = new MemoryStorage();
    const localRepository = createLocalAwthorRepository(() => storage);
    await localRepository.initialize();
    const book = await localRepository.createBook({ title: "Retry", author: "A. Writer" });
    storage.failNextSetFor = `${indexedDbRepositoryPrefix}:settings`;

    const repository = createIndexedDbAwthorRepository(repositoryOptions(storage));
    const failed = await repository.initialize();
    expect(failed.status).toBe("failed");
    expect(storage.getItem(`${localRepositoryPrefix}:books`)).not.toBeNull();

    const migrated = await repository.retryMigration();
    expect(migrated.status).toBe("migrated");
    expect(storage.getItem(`${localRepositoryPrefix}:books`)).toBeNull();
    expect((await repository.books.get())?.[0]?.id).toBe(book.id);
  });

  test("exports and restores the portable backup across IndexedDB databases", async () => {
    const sourceStorage = new MemoryStorage();
    const source = createIndexedDbAwthorRepository(repositoryOptions(sourceStorage));
    await source.initialize();
    const book = await source.createBook({ title: "Portable", author: "A. Writer" });
    const chapter = (await source.chapters.list(book.id))?.[0];
    if (!chapter) {
      throw new Error("Expected the initial chapter.");
    }
    await source.saveManuscript(book.id, chapter.id, "# Portable\n\nBackup text.");
    const backup = await source.exportBackup();

    const target = createIndexedDbAwthorRepository(repositoryOptions(new MemoryStorage()));
    await target.initialize();
    const result = await target.importBackup(backup);
    expect(result.importedVersion).toBe(2);
    expect((await target.getData()).chapters[book.id]?.[0]?.body).toBe(
      "# Portable\n\nBackup text.",
    );
  });
});
