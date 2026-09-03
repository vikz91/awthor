import { z } from "zod";
import { maxBackupFileBytes, parseBackupFile } from "../backup/archive";
import type { AwthorRepository, Book, Chapter, RepositoryData } from "../repository";
import type { JsonValue, SiteToolDefinition, WebMcpToolExecutionOptions } from "./runtime";

const maxManuscriptCharacters = 2_000_000;

const identifierSchema = z.string().trim().min(1).max(128);
const titleSchema = z.string().trim().min(1).max(200);
const authorSchema = z.string().trim().min(1).max(200);
const optionalGenreSchema = z
  .string()
  .trim()
  .max(200)
  .describe("Comma-separated genres, for example: Mystery, Romance")
  .optional();
const optionalSeriesSchema = z.string().trim().max(200).nullable().optional();
const optionalCoverUrlSchema = z
  .union([
    z.null(),
    z
      .string()
      .trim()
      .url()
      .refine((value) => value.startsWith("https://") || value.startsWith("http://"), {
        message: "Cover URLs must use HTTP or HTTPS.",
      }),
  ])
  .optional();

const createBookInputSchema = z.strictObject({
  title: titleSchema,
  author: authorSchema.optional(),
  genre: optionalGenreSchema,
  seriesName: optionalSeriesSchema,
  coverUrl: optionalCoverUrlSchema,
});

const bookIdInputSchema = z.strictObject({
  bookId: identifierSchema,
});

const chapterIdInputSchema = z.strictObject({
  bookId: identifierSchema,
  chapterId: identifierSchema,
});

const addChapterInputSchema = z.strictObject({
  bookId: identifierSchema,
  title: titleSchema.optional(),
  markdown: z.string().max(maxManuscriptCharacters).optional(),
});

const updateBookInputSchema = z
  .strictObject({
    bookId: identifierSchema,
    expectedUpdatedAt: z.string().trim().min(1).optional(),
    title: titleSchema.optional(),
    author: authorSchema.optional(),
    genre: optionalGenreSchema,
    seriesName: optionalSeriesSchema,
    coverUrl: optionalCoverUrlSchema,
  })
  .refine(
    ({ author, coverUrl, genre, seriesName, title }) =>
      author !== undefined ||
      coverUrl !== undefined ||
      genre !== undefined ||
      seriesName !== undefined ||
      title !== undefined,
    { message: "Provide at least one book field to update." },
  );

const updateChapterInputSchema = z
  .strictObject({
    bookId: identifierSchema,
    chapterId: identifierSchema,
    expectedUpdatedAt: z.string().trim().min(1).optional(),
    title: titleSchema.optional(),
    markdown: z.string().max(maxManuscriptCharacters).optional(),
  })
  .refine(({ markdown, title }) => markdown !== undefined || title !== undefined, {
    message: "Provide a title or Markdown manuscript to update.",
  });

const importDataInputSchema = z.strictObject({
  backupJson: z.string().min(1),
  confirmReplace: z.literal(true),
});

export type DataSiteToolOperation =
  | "list-books"
  | "read-book"
  | "read-chapter"
  | "create-book"
  | "add-chapter"
  | "update-book"
  | "update-chapter"
  | "export-data"
  | "import-data";

export type DataChangeContext = {
  operation: DataSiteToolOperation;
  bookId?: string;
  chapterId?: string;
};

export type RepositoryChangeNotification = DataChangeContext & {
  bookId?: string;
  chapterId?: string;
};

export type BackupDownload = {
  filename: string;
  contents: string;
  mimeType: "application/json";
};

export type CreateDataSiteToolsDependencies = {
  repository: AwthorRepository;
  prepareForDataChange?: (context: DataChangeContext) => Promise<void>;
  notifyRepositoryChanged?: (notification: RepositoryChangeNotification) => Promise<void> | void;
  downloadBackup?: (download: BackupDownload) => Promise<void> | void;
};

type BookSummary = {
  id: string;
  title: string;
  author: string;
  genre: string;
  seriesName: string;
  coverUrl: string | null;
  chapterCount: number;
  wordCount: number;
  updatedAt: string;
};

type ChapterSummary = {
  id: string;
  bookId: string;
  number: number;
  title: string;
  status: Chapter["status"];
  wordCount: number;
  characterCount: number;
  characterCountWithSpaces: number;
  updatedAt: string;
};

export class DataSiteToolError extends Error {
  constructor(
    readonly code:
      | "ABORTED"
      | "BOOK_NOT_FOUND"
      | "CHAPTER_NOT_FOUND"
      | "DOWNLOAD_UNAVAILABLE"
      | "INVALID_ARGUMENT"
      | "MIGRATION_FAILED"
      | "REVISION_CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "DataSiteToolError";
  }
}

export function createDataSiteTools({
  repository,
  prepareForDataChange = async () => undefined,
  notifyRepositoryChanged = () => undefined,
  downloadBackup = downloadJsonBackup,
}: CreateDataSiteToolsDependencies): SiteToolDefinition[] {
  async function prepare(
    context: DataChangeContext,
    options: WebMcpToolExecutionOptions,
  ): Promise<void> {
    assertNotAborted(options.signal);
    await requireReady(repository);
    assertNotAborted(options.signal);
    await prepareForDataChange(context);
    assertNotAborted(options.signal);
  }

  async function notify(notification: RepositoryChangeNotification): Promise<void> {
    await notifyRepositoryChanged(notification);
  }

  return [
    {
      name: "awthor_list_books",
      title: "List local Awthor books",
      description:
        "List local Awthor books with immutable IDs, metadata, counts, and update times. Manuscript text is not included.",
      inputSchema: emptyInputJsonSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (rawInput, options) => {
        parseInput(z.strictObject({}), rawInput);
        await prepare({ operation: "list-books" }, options);
        const books = (await repository.books.get()) ?? [];
        return { books: books.map(summarizeBook) };
      },
    },
    {
      name: "awthor_get_book",
      title: "Read local Awthor book metadata",
      description:
        "Read one local Awthor book's metadata and ordered chapter list by immutable book ID. Manuscript text is not included.",
      inputSchema: bookInputJsonSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (rawInput, options) => {
        const input = parseInput(bookIdInputSchema, rawInput);
        await prepare({ operation: "read-book", bookId: input.bookId }, options);
        const book = await requireBook(repository, input.bookId);
        const chapters = (await repository.chapters.list(input.bookId)) ?? [];
        return {
          book: summarizeBook(book),
          chapters: chapters.map((chapter) => summarizeChapter(input.bookId, chapter)),
        };
      },
    },
    {
      name: "awthor_get_chapter",
      title: "Read a local Awthor chapter",
      description:
        "Read one chapter's metadata and Markdown source by immutable book and chapter IDs. The returned manuscript is private author content.",
      inputSchema: chapterInputJsonSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (rawInput, options) => {
        const input = parseInput(chapterIdInputSchema, rawInput);
        await prepare(
          { operation: "read-chapter", bookId: input.bookId, chapterId: input.chapterId },
          options,
        );
        const book = await requireBook(repository, input.bookId);
        const chapters = (await repository.chapters.list(input.bookId)) ?? [];
        const chapter = chapters.find((candidate) => candidate.id === input.chapterId);
        if (!chapter) {
          throw new DataSiteToolError(
            "CHAPTER_NOT_FOUND",
            "This chapter no longer exists in the requested local book.",
          );
        }
        return {
          book: summarizeBook(book),
          chapter: summarizeChapter(input.bookId, chapter),
          markdown: chapter.body,
        };
      },
    },
    {
      name: "awthor_create_book",
      title: "Create an Awthor book",
      description:
        "Create a local Awthor book with an initial empty chapter. Uses the saved author profile when author is omitted.",
      inputSchema: createBookInputJsonSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (rawInput, options) => {
        const input = parseInput(createBookInputSchema, rawInput);
        const context = { operation: "create-book" } as const;
        await prepare(context, options);

        const author = input.author ?? (await repository.profile.get())?.authorName.trim() ?? "";
        if (!author) {
          throw new DataSiteToolError(
            "INVALID_ARGUMENT",
            "Author is required because no saved author profile is available.",
          );
        }

        assertNotAborted(options.signal);
        const book = await repository.createBook({
          title: input.title,
          author,
          genre: input.genre,
          seriesName: input.seriesName ?? "",
          coverUrl: input.coverUrl,
        });
        const initialChapter = (await repository.chapters.list(book.id))?.[0] ?? null;
        await notify({ operation: context.operation, bookId: book.id });

        return {
          book: summarizeBook(book),
          initialChapter: initialChapter ? summarizeChapter(book.id, initialChapter) : null,
        };
      },
    },
    {
      name: "awthor_add_chapter",
      title: "Add an Awthor chapter",
      description:
        "Add a local Markdown chapter to an existing Awthor book. An empty chapter is allowed.",
      inputSchema: addChapterInputJsonSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (rawInput, options) => {
        const input = parseInput(addChapterInputSchema, rawInput);
        const context = { operation: "add-chapter", bookId: input.bookId } as const;
        await prepare(context, options);
        await requireBook(repository, input.bookId);
        assertNotAborted(options.signal);

        const chapter = await repository.createChapter(input.bookId, {
          title: input.title,
          body: input.markdown,
        });
        const updatedBook = await requireBook(repository, input.bookId);
        await notify({ ...context, chapterId: chapter.id });

        return {
          chapter: summarizeChapter(input.bookId, chapter),
          bookUpdatedAt: updatedBook.updatedAt,
        };
      },
    },
    {
      name: "awthor_update_book",
      title: "Update Awthor book metadata",
      description:
        "Update the title, author, genre, series, or cover URL of a local Awthor book. Supply expectedUpdatedAt to reject stale changes.",
      inputSchema: updateBookInputJsonSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (rawInput, options) => {
        const input = parseInput(updateBookInputSchema, rawInput);
        const context = { operation: "update-book", bookId: input.bookId } as const;
        await prepare(context, options);

        const currentBook = await requireBook(repository, input.bookId);
        assertExpectedRevision("book", input.expectedUpdatedAt, currentBook.updatedAt);
        assertNotAborted(options.signal);

        const book = await repository.updateBook(input.bookId, {
          title: input.title,
          author: input.author,
          genre: input.genre,
          seriesName: input.seriesName === null ? "" : input.seriesName,
          coverUrl: input.coverUrl,
        });
        await notify(context);
        return { book: summarizeBook(book) };
      },
    },
    {
      name: "awthor_update_chapter",
      title: "Update an Awthor chapter",
      description:
        "Replace the title or Markdown manuscript of a local Awthor chapter. Supply expectedUpdatedAt to reject stale changes.",
      inputSchema: updateChapterInputJsonSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (rawInput, options) => {
        const input = parseInput(updateChapterInputSchema, rawInput);
        const context = {
          operation: "update-chapter",
          bookId: input.bookId,
          chapterId: input.chapterId,
        } as const;
        await prepare(context, options);
        await requireBook(repository, input.bookId);

        const chapters = (await repository.chapters.list(input.bookId)) ?? [];
        const currentChapter = chapters.find((chapter) => chapter.id === input.chapterId);
        if (!currentChapter) {
          throw new DataSiteToolError(
            "CHAPTER_NOT_FOUND",
            "This chapter no longer exists on this device.",
          );
        }
        assertExpectedRevision("chapter", input.expectedUpdatedAt, currentChapter.updatedAt);
        assertNotAborted(options.signal);

        const chapter = await repository.updateChapter(input.bookId, input.chapterId, {
          title: input.title,
          body: input.markdown,
        });
        const updatedBook = await requireBook(repository, input.bookId);
        await notify(context);

        return {
          chapter: summarizeChapter(input.bookId, chapter),
          bookUpdatedAt: updatedBook.updatedAt,
        };
      },
    },
    {
      name: "awthor_export_data",
      title: "Export Awthor data",
      description:
        "Download an unencrypted JSON backup of all local Awthor books and settings. Manuscript content is not returned to the assistant.",
      inputSchema: emptyInputJsonSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (rawInput, options) => {
        parseInput(z.strictObject({}), rawInput);
        await prepare({ operation: "export-data" }, options);

        const backup = await repository.exportBackup();
        const contents = JSON.stringify(backup, null, 2);
        const bytes = new TextEncoder().encode(contents).byteLength;
        const filename = jsonBackupFilename(backup.exportedAt);
        assertNotAborted(options.signal);
        await downloadBackup({ filename, contents, mimeType: "application/json" });

        return {
          filename,
          exportedAt: backup.exportedAt,
          bytes,
          summary: summarizeData(backup.data),
          unencrypted: true,
        };
      },
    },
    {
      name: "awthor_import_data",
      title: "Import Awthor data",
      description:
        "Replace all local Awthor data from a confirmed v1 or v2 JSON backup. This discards current local data.",
      inputSchema: importDataInputJsonSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (rawInput, options) => {
        const input = parseInput(importDataInputSchema, rawInput);
        const bytes = new TextEncoder().encode(input.backupJson);
        if (bytes.byteLength > maxBackupFileBytes) {
          throw new DataSiteToolError(
            "INVALID_ARGUMENT",
            "Backup files must be smaller than 10 MB.",
          );
        }

        const parsed = parseBackupFile(bytes);
        const context = { operation: "import-data" } as const;
        await prepare(context, options);
        assertNotAborted(options.signal);
        const result = await repository.importBackup(parsed.backup);
        const data = await repository.getData();
        await notify(context);

        return {
          importedVersion: result.importedVersion,
          discarded: result.discarded,
          summary: summarizeData(data),
        };
      },
    },
  ];
}

function parseInput<Output>(schema: z.ZodType<Output>, input: unknown): Output {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }

  const message = result.error.issues.map((issue) => issue.message).join(" ");
  throw new DataSiteToolError("INVALID_ARGUMENT", `Invalid tool input. ${message}`);
}

async function requireReady(repository: AwthorRepository): Promise<void> {
  const migration = await repository.initialize();
  if (migration.status === "failed") {
    throw new DataSiteToolError("MIGRATION_FAILED", migration.error.message);
  }
}

async function requireBook(repository: AwthorRepository, bookId: string): Promise<Book> {
  const book = (await repository.books.get())?.find((candidate) => candidate.id === bookId);
  if (!book) {
    throw new DataSiteToolError("BOOK_NOT_FOUND", "This book no longer exists on this device.");
  }
  return book;
}

function assertExpectedRevision(
  entity: "book" | "chapter",
  expectedUpdatedAt: string | undefined,
  currentUpdatedAt: string,
): void {
  if (expectedUpdatedAt === undefined || expectedUpdatedAt === currentUpdatedAt) {
    return;
  }

  throw new DataSiteToolError(
    "REVISION_CONFLICT",
    `The ${entity} changed after it was read. Expected ${expectedUpdatedAt}, but the current revision is ${currentUpdatedAt}. Read it again before updating.`,
  );
}

function assertNotAborted(signal: AbortSignal): void {
  if (!signal.aborted) {
    return;
  }

  throw new DataSiteToolError("ABORTED", "The WebMCP tool call was cancelled.");
}

function summarizeBook(book: Book): BookSummary {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    genre: book.genre,
    seriesName: book.seriesName,
    coverUrl: book.coverUrl,
    chapterCount: book.chapterCount,
    wordCount: book.wordCount,
    updatedAt: book.updatedAt,
  };
}

function summarizeChapter(bookId: string, chapter: Chapter): ChapterSummary {
  return {
    id: chapter.id,
    bookId,
    number: chapter.number,
    title: chapter.title,
    status: chapter.status,
    wordCount: chapter.wordCount,
    characterCount: chapter.characterCount,
    characterCountWithSpaces: chapter.characterCountWithSpaces,
    updatedAt: chapter.updatedAt,
  };
}

function summarizeData(data: RepositoryData) {
  return {
    books: data.books.length,
    chapters: Object.values(data.chapters).reduce((total, chapters) => total + chapters.length, 0),
    characters: Object.values(data.characters).reduce(
      (total, characters) => total + characters.length,
      0,
    ),
  };
}

function jsonBackupFilename(exportedAt: string): string {
  const date = new Date(exportedAt);
  const timestamp = Number.isNaN(date.getTime())
    ? "undated"
    : date
        .toISOString()
        .replace(/\.\d{3}Z$/u, "Z")
        .replaceAll(":", "-");
  return `awthor-backup-${timestamp}.json`;
}

function downloadJsonBackup(download: BackupDownload): void {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new DataSiteToolError(
      "DOWNLOAD_UNAVAILABLE",
      "This browser cannot start the Awthor backup download.",
    );
  }

  const blob = new Blob([download.contents], { type: download.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = download.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const emptyInputJsonSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} satisfies Record<string, JsonValue>;

const createBookInputJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 1, maxLength: 200 },
    author: { type: "string", minLength: 1, maxLength: 200 },
    genre: {
      type: "string",
      maxLength: 200,
      description: "Comma-separated genres, for example: Mystery, Romance",
    },
    seriesName: { type: ["string", "null"], maxLength: 200 },
    coverUrl: {
      type: ["string", "null"],
      format: "uri",
      description: "Optional HTTP(S) cover image URL. Use null to omit it.",
    },
  },
  required: ["title"],
  additionalProperties: false,
} satisfies Record<string, JsonValue>;

const bookInputJsonSchema = {
  type: "object",
  properties: {
    bookId: { type: "string", minLength: 1, maxLength: 128 },
  },
  required: ["bookId"],
  additionalProperties: false,
} satisfies Record<string, JsonValue>;

const chapterInputJsonSchema = {
  type: "object",
  properties: {
    bookId: { type: "string", minLength: 1, maxLength: 128 },
    chapterId: { type: "string", minLength: 1, maxLength: 128 },
  },
  required: ["bookId", "chapterId"],
  additionalProperties: false,
} satisfies Record<string, JsonValue>;

const addChapterInputJsonSchema = {
  type: "object",
  properties: {
    bookId: { type: "string", minLength: 1, maxLength: 128 },
    title: { type: "string", minLength: 1, maxLength: 200 },
    markdown: { type: "string", maxLength: maxManuscriptCharacters },
  },
  required: ["bookId"],
  additionalProperties: false,
} satisfies Record<string, JsonValue>;

const updateBookInputJsonSchema = {
  type: "object",
  properties: {
    bookId: { type: "string", minLength: 1, maxLength: 128 },
    expectedUpdatedAt: { type: "string", minLength: 1 },
    title: { type: "string", minLength: 1, maxLength: 200 },
    author: { type: "string", minLength: 1, maxLength: 200 },
    genre: {
      type: "string",
      maxLength: 200,
      description: "Comma-separated genres, for example: Mystery, Romance",
    },
    seriesName: { type: ["string", "null"], maxLength: 200 },
    coverUrl: {
      type: ["string", "null"],
      format: "uri",
      description: "Set null to remove the current cover URL.",
    },
  },
  required: ["bookId"],
  anyOf: [
    { required: ["title"] },
    { required: ["author"] },
    { required: ["genre"] },
    { required: ["seriesName"] },
    { required: ["coverUrl"] },
  ],
  additionalProperties: false,
} satisfies Record<string, JsonValue>;

const updateChapterInputJsonSchema = {
  type: "object",
  properties: {
    bookId: { type: "string", minLength: 1, maxLength: 128 },
    chapterId: { type: "string", minLength: 1, maxLength: 128 },
    expectedUpdatedAt: { type: "string", minLength: 1 },
    title: { type: "string", minLength: 1, maxLength: 200 },
    markdown: { type: "string", maxLength: maxManuscriptCharacters },
  },
  required: ["bookId", "chapterId"],
  anyOf: [{ required: ["title"] }, { required: ["markdown"] }],
  additionalProperties: false,
} satisfies Record<string, JsonValue>;

const importDataInputJsonSchema = {
  type: "object",
  properties: {
    backupJson: {
      type: "string",
      minLength: 1,
      description: "The complete text of an Awthor v1 or v2 JSON backup, up to 10 MiB.",
    },
    confirmReplace: {
      type: "boolean",
      const: true,
      description: "Must be true to confirm replacement of all current local Awthor data.",
    },
  },
  required: ["backupJson", "confirmReplace"],
  additionalProperties: false,
} satisfies Record<string, JsonValue>;
