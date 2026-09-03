import "server-only";

import { randomUUID } from "node:crypto";
import type { ClientSession, Db } from "mongodb";
import { z } from "zod";
import { normalizeGenreCsv } from "@/lib/genres";
import { countManuscript, getLeadingMarkdownTitle } from "@/lib/markdown";
import {
  appSettingsSchema,
  type Book,
  bookSchema,
  type Chapter,
  type Character,
  chapterSchema,
  characterSchema,
  createDefaultAppSettings,
  createDefaultChapterArc,
  onboardingDetailsSchema,
  type RepositoryData,
  themeSchema,
} from "@/lib/repository";
import type { SyncedRecord, SyncRecord } from "@/lib/sync/types";
import {
  buildPublishedStory,
  ensurePublishedStoryIndexes,
  getPublishedStoryForBook,
  removePublishedStory,
  savePublishedStory,
} from "./published-stories";
import { assertRemoteWritesAccepted, RemoteWorkspaceError } from "./remote-workspace-conflicts";
import { ensureSyncIndexes, listUserSyncRecords, pushSyncRecords } from "./sync-records";

export {
  assertRemoteWritesAccepted,
  RemoteWorkspaceError,
  type RemoteWorkspaceErrorCode,
} from "./remote-workspace-conflicts";

const remoteDeviceId = "awthor-remote-mcp";
const idSchema = z.string().min(1).max(128);
const titleSchema = z.string().trim().min(1).max(200);
const markdownSchema = z.string().max(2_000_000);
const remoteUrlSchema = z
  .string()
  .url()
  .max(2_000)
  .refine((value) => value.startsWith("https://") || value.startsWith("http://"), {
    message: "Only HTTP(S) URLs are supported.",
  });
const chapterRecordSchema = chapterSchema.and(z.object({ bookId: idSchema }));
const characterRecordSchema = characterSchema.and(z.object({ bookId: idSchema }));
const remoteCharacterFields = {
  arc: z.string().max(10_000).optional(),
  characteristics: z.array(z.string().max(500)).max(100).optional(),
  dob: z.string().max(100).optional(),
  hidden: z.boolean().optional(),
  image: remoteUrlSchema.or(z.literal("")).optional(),
  language: z.string().max(200).optional(),
  location: z.string().max(500).optional(),
  mentalDescription: z.string().max(10_000).optional(),
  name: titleSchema.optional(),
  physicalDescription: z.string().max(10_000).optional(),
  relationships: z.string().max(10_000).optional(),
  storyRole: z.string().max(500).optional(),
} as const;
export const remoteCreateCharacterSchema = z
  .object({ ...remoteCharacterFields, name: titleSchema })
  .strict();
export const remoteUpdateCharacterSchema = z.object(remoteCharacterFields).strict();

export const remoteCreateBookSchema = z.object({
  author: z.string().trim().max(200).default(""),
  coverUrl: remoteUrlSchema.nullable().optional(),
  genre: z.string().trim().max(200).optional(),
  seriesName: z.string().trim().max(200).optional(),
  title: titleSchema,
});
export const remoteCreateChapterSchema = z.object({
  body: markdownSchema.default(""),
  title: titleSchema.optional(),
});
export const remoteUpdateBookSchema = remoteCreateBookSchema
  .partial()
  .omit({ title: true })
  .extend({ title: titleSchema.optional() });
export const remoteUpdateChapterSchema = z.object({
  arc: z
    .object({
      conflict: z.string().max(10_000).default(""),
      goal: z.string().max(10_000).default(""),
      outcome: z.string().max(10_000).default(""),
      stage: z.enum([
        "Unassigned",
        "Setup",
        "Rising action",
        "Midpoint",
        "Escalation",
        "Climax",
        "Resolution",
      ]),
      tension: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    })
    .partial()
    .optional(),
  body: markdownSchema.optional(),
  pov: z.string().max(500).optional(),
  status: z.enum(["Draft", "Revision", "Complete"]).optional(),
  summary: z.string().max(10_000).optional(),
  title: titleSchema.optional(),
});

type CloudWorkspace = RepositoryData & { records: SyncedRecord[] };

function now() {
  return new Date().toISOString();
}
function recordId(bookId: string, entityId: string) {
  return `${bookId}:${entityId}`;
}
function countChapter(body: string) {
  const { characterCount, characterCountWithSpaces, wordCount } = countManuscript(body);
  return { characterCount, characterCountWithSpaces, wordCount };
}

function makeRecord(
  recordType: SyncRecord["recordType"],
  id: string,
  payload: unknown,
  deleted = false,
): SyncRecord {
  return {
    contentHash: "",
    deleted,
    deviceId: remoteDeviceId,
    modifiedAt: now(),
    payload: deleted ? null : payload,
    recordId: id,
    recordType,
  };
}

function defaultBook(input: z.infer<typeof remoteCreateBookSchema>): Book {
  const timestamp = now();
  return bookSchema.parse({
    author: input.author,
    chapterCount: 0,
    characterCount: 0,
    characterCountWithSpaces: 0,
    coverUrl: input.coverUrl ?? null,
    createdAt: timestamp,
    genre: normalizeGenreCsv(input.genre ?? ""),
    id: randomUUID(),
    isPartOfSeries: Boolean(input.seriesName),
    pageCount: 0,
    seriesName: input.seriesName ?? "",
    seriesPosition: null,
    title: input.title,
    updatedAt: timestamp,
    wordCount: 0,
  });
}

function defaultChapter(
  _bookId: string,
  number: number,
  input: z.infer<typeof remoteCreateChapterSchema>,
): Chapter {
  const timestamp = now();
  const body = input.body;
  return chapterSchema.parse({
    arc: createDefaultChapterArc(),
    body,
    createdAt: timestamp,
    id: randomUUID(),
    number,
    title: input.title ?? getLeadingMarkdownTitle(body) ?? `Chapter ${number}`,
    updatedAt: timestamp,
    ...countChapter(body),
  });
}

/** Pure construction helper for the initial two-record book mutation. */
export function createRemoteBookWithInitialChapter(input: unknown) {
  const book = defaultBook(remoteCreateBookSchema.parse(input));
  const initialChapter = defaultChapter(book.id, 1, { body: "" });
  return {
    book: bookSchema.parse({ ...book, chapterCount: 1, pageCount: 0 }),
    initialChapter,
  };
}

function materialize(records: readonly SyncedRecord[]): CloudWorkspace {
  const profileRecord = records.find(
    (record) => record.recordType === "profile" && !record.deleted,
  );
  const themeRecord = records.find((record) => record.recordType === "theme" && !record.deleted);
  const settingsRecord = records.find(
    (record) => record.recordType === "settings" && !record.deleted,
  );
  const books = records
    .filter((record) => record.recordType === "book" && !record.deleted)
    .map((record) => bookSchema.parse(record.payload));
  const bookIds = new Set(books.map((book) => book.id));
  const chapters: Record<string, Chapter[]> = {};
  const characters: Record<string, Character[]> = {};
  for (const book of books) {
    chapters[book.id] = [];
    characters[book.id] = [];
  }
  for (const record of records) {
    if (record.deleted || record.recordType === "chapter") {
      if (!record.deleted && record.recordType === "chapter") {
        const parsed = chapterRecordSchema.parse(record.payload);
        if (bookIds.has(parsed.bookId)) chapters[parsed.bookId].push(chapterSchema.parse(parsed));
      }
    } else if (record.recordType === "character") {
      const parsed = characterRecordSchema.parse(record.payload);
      if (bookIds.has(parsed.bookId)) characters[parsed.bookId].push(characterSchema.parse(parsed));
    }
  }
  for (const values of Object.values(chapters)) values.sort((a, b) => a.number - b.number);
  return {
    books,
    chapters,
    characters,
    profile: profileRecord ? onboardingDetailsSchema.parse(profileRecord.payload) : null,
    records: [...records],
    settings: settingsRecord
      ? appSettingsSchema.parse(settingsRecord.payload)
      : createDefaultAppSettings(),
    theme: themeRecord ? themeSchema.parse(themeRecord.payload) : "paper",
  };
}

function exportedData(workspace: CloudWorkspace): RepositoryData {
  const { records: _records, ...data } = workspace;
  return data;
}

export class RemoteWorkspaceService {
  private syncIndexes?: Promise<void>;

  constructor(
    private readonly database: Db,
    private readonly userId: string,
  ) {}

  private async workspace(requireSynced = true, session?: ClientSession) {
    const records = await listUserSyncRecords(this.database, this.userId, { session });
    if (requireSynced && records.length === 0) {
      throw new RemoteWorkspaceError(
        "WORKSPACE_NOT_SYNCED",
        "No cloud workspace is available yet. Open Awthor and choose Sync first.",
      );
    }
    return materialize(records);
  }

  private async ensureIndexes() {
    this.syncIndexes ??= ensureSyncIndexes(this.database);
    await this.syncIndexes;
  }

  private async write(records: readonly SyncRecord[], session?: ClientSession) {
    if (!session) await this.ensureIndexes();
    const result = await pushSyncRecords(this.database, this.userId, records, { session });
    assertRemoteWritesAccepted(records, result.records);
    return result.records;
  }

  async getWorkspace() {
    return exportedData(await this.workspace());
  }
  async exportData() {
    return exportedData(await this.workspace());
  }
  async listBooks() {
    return (await this.workspace()).books;
  }
  async getBook(bookId: string) {
    return this.requireBook(await this.workspace(), bookId);
  }
  async listChapters(bookId: string) {
    const w = await this.workspace();
    this.requireBook(w, bookId);
    return w.chapters[bookId];
  }
  async getChapter(bookId: string, chapterId: string) {
    return this.requireChapter(await this.workspace(), bookId, chapterId);
  }
  async listCharacters(bookId: string) {
    const w = await this.workspace();
    this.requireBook(w, bookId);
    return w.characters[bookId];
  }
  async getCharacter(bookId: string, characterId: string) {
    return this.requireCharacter(await this.workspace(), bookId, characterId);
  }

  private requireBook(workspace: CloudWorkspace, bookId: string) {
    const book = workspace.books.find((candidate) => candidate.id === bookId);
    if (!book)
      throw new RemoteWorkspaceError(
        "BOOK_NOT_FOUND",
        "That book is not in your synced workspace.",
      );
    return book;
  }
  private requireChapter(workspace: CloudWorkspace, bookId: string, chapterId: string) {
    this.requireBook(workspace, bookId);
    const chapter = workspace.chapters[bookId].find((candidate) => candidate.id === chapterId);
    if (!chapter)
      throw new RemoteWorkspaceError(
        "CHAPTER_NOT_FOUND",
        "That chapter is not in the selected book.",
      );
    return chapter;
  }
  private requireCharacter(workspace: CloudWorkspace, bookId: string, characterId: string) {
    this.requireBook(workspace, bookId);
    const character = workspace.characters[bookId].find(
      (candidate) => candidate.id === characterId,
    );
    if (!character)
      throw new RemoteWorkspaceError(
        "CHARACTER_NOT_FOUND",
        "That character is not in the selected book.",
      );
    return character;
  }

  async createBook(input: unknown) {
    const { book: initialBook, initialChapter } = createRemoteBookWithInitialChapter(input);
    await this.write([
      makeRecord("book", initialBook.id, initialBook),
      makeRecord("chapter", recordId(initialBook.id, initialChapter.id), {
        ...initialChapter,
        bookId: initialBook.id,
      }),
    ]);
    return { book: initialBook, initialChapter };
  }
  async updateBook(bookId: string, input: unknown) {
    const workspace = await this.workspace();
    const book = this.requireBook(workspace, bookId);
    const patch = remoteUpdateBookSchema.parse(input);
    const genre = patch.genre === undefined ? book.genre : normalizeGenreCsv(patch.genre);
    const updated = bookSchema.parse({
      ...book,
      ...patch,
      genre,
      updatedAt: now(),
      isPartOfSeries:
        patch.seriesName === undefined ? book.isPartOfSeries : Boolean(patch.seriesName),
    });
    await this.write([makeRecord("book", bookId, updated)]);
    return updated;
  }
  async deleteBook(bookId: string) {
    const workspace = await this.workspace();
    this.requireBook(workspace, bookId);
    const records: SyncRecord[] = [makeRecord("book", bookId, null, true)];
    for (const chapter of workspace.chapters[bookId])
      records.push(makeRecord("chapter", recordId(bookId, chapter.id), null, true));
    for (const character of workspace.characters[bookId])
      records.push(makeRecord("character", recordId(bookId, character.id), null, true));
    await this.write(records);
    await removePublishedStory(this.database, this.userId, bookId);
  }
  async createChapter(bookId: string, input: unknown = {}) {
    const workspace = await this.workspace();
    this.requireBook(workspace, bookId);
    const chapter = defaultChapter(
      bookId,
      workspace.chapters[bookId].length + 1,
      remoteCreateChapterSchema.parse(input),
    );
    await this.write([makeRecord("chapter", recordId(bookId, chapter.id), { ...chapter, bookId })]);
    await this.refreshBookAggregate(bookId);
    return chapter;
  }
  async updateChapter(bookId: string, chapterId: string, input: unknown) {
    const workspace = await this.workspace();
    const chapter = this.requireChapter(workspace, bookId, chapterId);
    const patch = remoteUpdateChapterSchema.parse(input);
    const body = patch.body ?? chapter.body;
    const updated = chapterSchema.parse({
      ...chapter,
      ...patch,
      arc: { ...chapter.arc, ...patch.arc },
      ...countChapter(body),
      body,
      updatedAt: now(),
    });
    await this.write([makeRecord("chapter", recordId(bookId, chapterId), { ...updated, bookId })]);
    await this.refreshBookAggregate(bookId);
    return updated;
  }
  async updateChapterArc(bookId: string, chapterId: string, arc: unknown) {
    return this.updateChapter(bookId, chapterId, { arc });
  }
  async reorderChapters(bookId: string, orderedChapterIds: readonly string[]) {
    const workspace = await this.workspace();
    const current = workspace.chapters[bookId];
    this.requireBook(workspace, bookId);
    if (
      current.length !== orderedChapterIds.length ||
      new Set(orderedChapterIds).size !== current.length ||
      orderedChapterIds.some((id) => !current.some((chapter) => chapter.id === id))
    )
      throw new Error("Chapter order must contain every chapter exactly once.");
    const updates = orderedChapterIds.map((chapterId, index) => {
      const chapter = this.requireChapter(workspace, bookId, chapterId);
      const updated = chapterSchema.parse({ ...chapter, number: index + 1, updatedAt: now() });
      return makeRecord("chapter", recordId(bookId, chapter.id), { ...updated, bookId });
    });
    await this.write(updates);
    return (await this.workspace()).chapters[bookId];
  }
  async deleteChapter(bookId: string, chapterId: string) {
    const workspace = await this.workspace();
    this.requireChapter(workspace, bookId, chapterId);
    await this.write([makeRecord("chapter", recordId(bookId, chapterId), null, true)]);
    await this.refreshBookAggregate(bookId);
  }
  async createCharacter(bookId: string, input: unknown) {
    const workspace = await this.workspace();
    this.requireBook(workspace, bookId);
    const character = characterSchema.parse({
      ...remoteCreateCharacterSchema.parse(input),
      id: randomUUID(),
    });
    await this.write([
      makeRecord("character", recordId(bookId, character.id), { ...character, bookId }),
    ]);
    return character;
  }
  async updateCharacter(bookId: string, characterId: string, input: unknown) {
    const workspace = await this.workspace();
    const character = this.requireCharacter(workspace, bookId, characterId);
    const updated = characterSchema.parse({
      ...character,
      ...remoteUpdateCharacterSchema.parse(input),
    });
    await this.write([
      makeRecord("character", recordId(bookId, characterId), { ...updated, bookId }),
    ]);
    return updated;
  }
  async deleteCharacter(bookId: string, characterId: string) {
    const w = await this.workspace();
    this.requireCharacter(w, bookId, characterId);
    await this.write([makeRecord("character", recordId(bookId, characterId), null, true)]);
  }
  async updateProfile(input: unknown) {
    const profile = onboardingDetailsSchema.parse(input);
    await this.write([makeRecord("profile", "profile", profile)]);
    return profile;
  }
  async updateTheme(input: unknown) {
    const theme = themeSchema.parse(input);
    await this.write([makeRecord("theme", "theme", theme)]);
    return theme;
  }
  async updateSettings(input: unknown) {
    const settings = appSettingsSchema.parse(input);
    const { backupReminder: _backupReminder, ...synced } = settings;
    await this.write([makeRecord("settings", "settings", synced)]);
    return settings;
  }
  async importData(input: unknown) {
    const data = z
      .object({
        books: bookSchema.array(),
        chapters: z.record(z.string(), chapterSchema.array()),
        characters: z.record(z.string(), characterSchema.array()),
        profile: onboardingDetailsSchema.nullable(),
        settings: appSettingsSchema,
        theme: themeSchema,
      })
      .strict()
      .parse(input);
    await this.ensureIndexes();
    const session = this.database.client.startSession();
    try {
      await session.withTransaction(async () => {
        const workspace = await this.workspace(false, session);
        const records: SyncRecord[] = [
          makeRecord("theme", "theme", data.theme),
          makeRecord(
            "settings",
            "settings",
            (() => {
              const { backupReminder: _backupReminder, ...settings } = data.settings;
              return settings;
            })(),
          ),
        ];
        if (data.profile) records.push(makeRecord("profile", "profile", data.profile));
        for (const book of data.books) {
          records.push(makeRecord("book", book.id, book));
          for (const chapter of data.chapters[book.id] ?? [])
            records.push(
              makeRecord("chapter", recordId(book.id, chapter.id), { ...chapter, bookId: book.id }),
            );
          for (const character of data.characters[book.id] ?? [])
            records.push(
              makeRecord("character", recordId(book.id, character.id), {
                ...character,
                bookId: book.id,
              }),
            );
        }
        const retained = new Set(
          records.map((record) => `${record.recordType}:${record.recordId}`),
        );
        for (const existing of workspace.records) {
          const key = `${existing.recordType}:${existing.recordId}`;
          if (!existing.deleted && !retained.has(key)) {
            records.push(makeRecord(existing.recordType, existing.recordId, null, true));
          }
        }
        for (let start = 0; start < records.length; start += 50)
          await this.write(records.slice(start, start + 50), session);
        const importedBookIds = new Set(data.books.map((book) => book.id));
        for (const previousBook of workspace.books) {
          if (!importedBookIds.has(previousBook.id)) {
            await removePublishedStory(this.database, this.userId, previousBook.id, { session });
          }
        }
      });
    } finally {
      await session.endSession();
    }
    return this.getWorkspace();
  }
  async publishBook(bookId: string) {
    const workspace = await this.workspace();
    const book = this.requireBook(workspace, bookId);
    const existing = await getPublishedStoryForBook(this.database, this.userId, bookId);
    const story = buildPublishedStory({
      authorEmail: workspace.profile?.contactEmail ?? "",
      authorName: book.author || workspace.profile?.authorName || "",
      book,
      chapters: workspace.chapters[bookId],
      existingPublishedAt: existing?.publishedAt,
      now: now(),
      publicId: existing?.publicId ?? randomUUID().replaceAll("-", ""),
      userId: this.userId,
    });
    await ensurePublishedStoryIndexes(this.database);
    return savePublishedStory(this.database, story);
  }
  async getPublishedBook(bookId: string) {
    const workspace = await this.workspace();
    this.requireBook(workspace, bookId);
    return getPublishedStoryForBook(this.database, this.userId, bookId);
  }
  async unpublishBook(bookId: string) {
    const w = await this.workspace();
    this.requireBook(w, bookId);
    await removePublishedStory(this.database, this.userId, bookId);
  }

  private async refreshBookAggregate(bookId: string) {
    const workspace = await this.workspace();
    const book = this.requireBook(workspace, bookId);
    const chapters = workspace.chapters[bookId];
    const wordCount = chapters.reduce((total, chapter) => total + chapter.wordCount, 0);
    const updated = bookSchema.parse({
      ...book,
      chapterCount: chapters.length,
      characterCount: chapters.reduce((total, chapter) => total + chapter.characterCount, 0),
      characterCountWithSpaces: chapters.reduce(
        (total, chapter) => total + chapter.characterCountWithSpaces,
        0,
      ),
      pageCount: wordCount === 0 ? 0 : Math.ceil(wordCount / 250),
      updatedAt: now(),
      wordCount,
    });
    await this.write([makeRecord("book", bookId, updated)]);
    return updated;
  }
}

export function createRemoteWorkspaceService(database: Db, userId: string) {
  return new RemoteWorkspaceService(database, userId);
}
