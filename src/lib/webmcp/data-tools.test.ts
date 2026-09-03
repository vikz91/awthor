import { describe, expect, test } from "bun:test";
import type { AwthorRepository } from "../repository";
import { createLocalAwthorRepository, type StorageLike } from "../repository/local-repository";
import { onboardingDetailsSchema } from "../repository/models";
import {
  type BackupDownload,
  createDataSiteTools,
  type DataChangeContext,
  DataSiteToolError,
  type RepositoryChangeNotification,
} from "./data-tools";
import type { JsonValue, SiteToolDefinition } from "./runtime";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function createRepository(): AwthorRepository {
  const storage = new MemoryStorage();
  return createLocalAwthorRepository(() => storage);
}

function findTool(tools: readonly SiteToolDefinition[], name: string): SiteToolDefinition {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) {
    throw new Error(`Missing tool: ${name}`);
  }
  return tool;
}

async function execute(
  tool: SiteToolDefinition,
  input: Record<string, unknown>,
): Promise<JsonValue> {
  return tool.execute(input, { signal: new AbortController().signal });
}

function asRecord(value: JsonValue): Record<string, JsonValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected a JSON object.");
  }
  return value;
}

describe("WebMCP data tools", () => {
  test("exposes the narrow read and write tools with closed input schemas", () => {
    const tools = createDataSiteTools({ repository: createRepository() });

    expect(tools.map((tool) => tool.name)).toEqual([
      "awthor_list_books",
      "awthor_get_book",
      "awthor_get_chapter",
      "awthor_create_book",
      "awthor_add_chapter",
      "awthor_update_book",
      "awthor_update_chapter",
      "awthor_export_data",
      "awthor_import_data",
    ]);
    expect(tools.every((tool) => tool.inputSchema?.additionalProperties === false)).toBe(true);
    expect(tools.slice(0, 3).every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);
    expect(tools.slice(3).every((tool) => tool.annotations?.readOnlyHint === false)).toBe(true);
  });

  test("lists books and reads metadata before returning an explicitly requested chapter source", async () => {
    const repository = createRepository();
    const book = await repository.createBook({ title: "Reading Room", author: "Writer" });
    const chapter = (await repository.chapters.list(book.id))?.[0];
    if (!chapter) {
      throw new Error("Expected the initial chapter.");
    }
    await repository.saveManuscript(book.id, chapter.id, "# Opening\n\nPrivate manuscript text.");
    const tools = createDataSiteTools({ repository });

    const listed = asRecord(await execute(findTool(tools, "awthor_list_books"), {}));
    const listedBook = asRecord((listed.books as JsonValue[])[0]);
    expect(listedBook).toMatchObject({ id: book.id, title: "Reading Room" });

    const bookResult = asRecord(
      await execute(findTool(tools, "awthor_get_book"), { bookId: book.id }),
    );
    expect(JSON.stringify(bookResult)).not.toContain("Private manuscript text.");
    expect(bookResult.chapters as JsonValue[]).toHaveLength(1);

    const chapterResult = asRecord(
      await execute(findTool(tools, "awthor_get_chapter"), {
        bookId: book.id,
        chapterId: chapter.id,
      }),
    );
    expect(chapterResult.markdown).toContain("Private manuscript text.");
  });

  test("creates a series book using the saved profile author and sends a summary notification", async () => {
    const repository = createRepository();
    await repository.initialize();
    await repository.profile.save(
      onboardingDetailsSchema.parse({
        authorName: "A. Writer",
        contactEmail: "writer@example.com",
        defaultProofreadingDialect: "american",
        theme: "paper",
        website: "",
      }),
    );
    const prepared: DataChangeContext[] = [];
    const notifications: RepositoryChangeNotification[] = [];
    const tools = createDataSiteTools({
      repository,
      prepareForDataChange: async (context) => {
        prepared.push(context);
      },
      notifyRepositoryChanged: (notification) => {
        notifications.push(notification);
      },
    });

    const result = asRecord(
      await execute(findTool(tools, "awthor_create_book"), {
        title: "The Quiet Archive",
        genre: "Mystery, Romance",
        seriesName: "Archive Cycle",
      }),
    );
    const book = asRecord(result.book);
    const chapter = asRecord(result.initialChapter);

    expect(book.title).toBe("The Quiet Archive");
    expect(book.author).toBe("A. Writer");
    expect(book.genre).toBe("Mystery, Romance");
    expect(book.seriesName).toBe("Archive Cycle");
    expect(chapter.number).toBe(1);
    expect(chapter).not.toHaveProperty("body");
    expect(prepared).toEqual([{ operation: "create-book" }]);
    expect(notifications).toEqual([{ operation: "create-book", bookId: expect.any(String) }]);

    const data = await repository.getData();
    expect(data.books[0]?.isPartOfSeries).toBe(true);
    expect(data.books[0]?.genre).toBe("Mystery, Romance");
    expect(data.books[0]?.seriesName).toBe("Archive Cycle");
  });

  test("adds and updates chapters without returning manuscript content", async () => {
    const repository = createRepository();
    const book = await repository.createBook({ title: "Draft", author: "Writer" });
    const notifications: RepositoryChangeNotification[] = [];
    const tools = createDataSiteTools({
      repository,
      notifyRepositoryChanged: (notification) => {
        notifications.push(notification);
      },
    });

    const addedResult = asRecord(
      await execute(findTool(tools, "awthor_add_chapter"), {
        bookId: book.id,
        title: "Arrival",
        markdown: "# Arrival\n\nA secret manuscript begins here.",
      }),
    );
    const addedChapter = asRecord(addedResult.chapter);
    const chapterId = String(addedChapter.id);

    expect(addedChapter.title).toBe("Arrival");
    expect(addedChapter).not.toHaveProperty("body");
    expect(JSON.stringify(addedResult)).not.toContain("secret manuscript");

    const storedChapter = (await repository.chapters.list(book.id))?.find(
      (chapter) => chapter.id === chapterId,
    );
    expect(storedChapter).toBeDefined();

    const updatedResult = asRecord(
      await execute(findTool(tools, "awthor_update_chapter"), {
        bookId: book.id,
        chapterId,
        expectedUpdatedAt: storedChapter?.updatedAt,
        title: "The Arrival",
        markdown: "# The Arrival\n\nRevised local-only prose.",
      }),
    );
    const updatedChapter = asRecord(updatedResult.chapter);

    expect(updatedChapter.title).toBe("The Arrival");
    expect(updatedChapter).not.toHaveProperty("body");
    expect((await repository.chapters.list(book.id))?.[1]?.body).toContain(
      "Revised local-only prose.",
    );
    expect(notifications).toEqual([
      { operation: "add-chapter", bookId: book.id, chapterId },
      { operation: "update-chapter", bookId: book.id, chapterId },
    ]);
  });

  test("validates partial updates and rejects stale revisions before repository writes", async () => {
    const repository = createRepository();
    const book = await repository.createBook({ title: "Original", author: "Writer" });
    const notifications: RepositoryChangeNotification[] = [];
    const tools = createDataSiteTools({
      repository,
      notifyRepositoryChanged: (notification) => {
        notifications.push(notification);
      },
    });
    const updateBook = findTool(tools, "awthor_update_book");
    const updateChapter = findTool(tools, "awthor_update_chapter");
    const chapter = (await repository.chapters.list(book.id))?.[0];

    await expect(execute(updateBook, { bookId: book.id })).rejects.toMatchObject({
      code: "INVALID_ARGUMENT",
    });
    await expect(
      execute(updateBook, {
        bookId: book.id,
        title: "Stale change",
        expectedUpdatedAt: "2000-01-01T00:00:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
    await expect(
      execute(updateChapter, { bookId: book.id, chapterId: chapter?.id }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
    expect(notifications).toHaveLength(0);
    expect((await repository.books.get())?.[0]?.title).toBe("Original");

    const result = asRecord(
      await execute(updateBook, {
        bookId: book.id,
        expectedUpdatedAt: book.updatedAt,
        title: "Revised",
        author: "New Writer",
        genre: "Thriller, Mystery",
        seriesName: "New Series",
        coverUrl: "https://example.com/cover.jpg",
      }),
    );
    expect(asRecord(result.book)).toMatchObject({
      title: "Revised",
      author: "New Writer",
      genre: "Thriller, Mystery",
      seriesName: "New Series",
      coverUrl: "https://example.com/cover.jpg",
    });
    expect(notifications).toEqual([{ operation: "update-book", bookId: book.id }]);
  });

  test("downloads an unencrypted JSON backup but returns only counts and file metadata", async () => {
    const repository = createRepository();
    const book = await repository.createBook({ title: "Exported", author: "Writer" });
    const chapter = (await repository.chapters.list(book.id))?.[0];
    if (!chapter) {
      throw new Error("Expected the initial chapter.");
    }
    await repository.updateChapter(book.id, chapter.id, {
      body: "# Chapter 1\n\nDo not echo this private manuscript.",
    });
    const downloads: BackupDownload[] = [];
    const prepared: DataChangeContext[] = [];
    const tools = createDataSiteTools({
      repository,
      prepareForDataChange: async (context) => {
        prepared.push(context);
      },
      downloadBackup: (download) => {
        downloads.push(download);
      },
    });

    const result = asRecord(await execute(findTool(tools, "awthor_export_data"), {}));

    expect(prepared).toEqual([{ operation: "export-data" }]);
    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.filename).toMatch(/^awthor-backup-.+\.json$/u);
    expect(JSON.parse(downloads[0]?.contents ?? "{}").format).toBe("awthor-local-storage-backup");
    expect(result.summary).toEqual({ books: 1, chapters: 1, characters: 0 });
    expect(result.bytes).toBe(new TextEncoder().encode(downloads[0]?.contents).byteLength);
    expect(result.unencrypted).toBe(true);
    expect(JSON.stringify(result)).not.toContain("private manuscript");
  });

  test("requires explicit replacement confirmation and imports a validated JSON backup", async () => {
    const source = createRepository();
    const sourceBook = await source.createBook({
      title: "Imported Book",
      author: "Writer",
      seriesName: "Imported Series",
    });
    await source.createChapter(sourceBook.id, { title: "Second chapter", body: "Local prose" });
    const backupJson = JSON.stringify(await source.exportBackup());

    const target = createRepository();
    await target.createBook({ title: "Replace Me", author: "Writer" });
    const prepared: DataChangeContext[] = [];
    const notifications: RepositoryChangeNotification[] = [];
    const tools = createDataSiteTools({
      repository: target,
      prepareForDataChange: async (context) => {
        prepared.push(context);
      },
      notifyRepositoryChanged: (notification) => {
        notifications.push(notification);
      },
    });
    const importTool = findTool(tools, "awthor_import_data");

    await expect(execute(importTool, { backupJson, confirmReplace: false })).rejects.toBeInstanceOf(
      DataSiteToolError,
    );
    expect((await target.books.get())?.[0]?.title).toBe("Replace Me");

    const result = asRecord(await execute(importTool, { backupJson, confirmReplace: true }));

    expect(result.importedVersion).toBe(2);
    expect(result.summary).toEqual({ books: 1, chapters: 2, characters: 0 });
    expect((await target.books.get())?.[0]?.title).toBe("Imported Book");
    expect(prepared).toEqual([{ operation: "import-data" }]);
    expect(notifications).toEqual([{ operation: "import-data" }]);
  });
});
