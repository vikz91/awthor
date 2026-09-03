import { type ZodType, z } from "zod";
import { sanitizeBookCoverUrl } from "@/lib/book-cover-generator";
import { normalizeGenreCsv } from "@/lib/genres";
import { countManuscript, getLeadingMarkdownTitle, withLeadingMarkdownTitle } from "../markdown";
import {
  type AwthorBackupV2,
  type AwthorRepository,
  awthorBackupFormat,
  awthorBackupVersion,
  type BackupImportResult,
  type CreateBookInput,
  type CreateChapterInput,
  type CreateCharacterInput,
  type DiscardedLegacyData,
  type ManuscriptSaveResult,
  type MigrationResult,
  type RepositoryData,
  type ScopedCollectionRepository,
  type UpdateBookInput,
  type UpdateChapterInput,
  type UpdateCharacterInput,
  type ValueRepository,
} from "./contract";
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
  type OnboardingDetails,
  onboardingDetailsSchema,
  type Theme,
  themeSchema,
} from "./models";

export const repositorySchemaVersion = 2;
export const repositoryPrefix = `awthor:repository:v${repositorySchemaVersion}`;
export const legacyRepositoryPrefix = "awthor:repository:v1";
export const themeStorageKey = "awthor-theme";

const legacyProfileStorageKey = "awthor:onboarding:v1";
const profileKey = `${repositoryPrefix}:profile`;
const booksKey = `${repositoryPrefix}:books`;
const settingsKey = `${repositoryPrefix}:settings`;

export interface StorageLike {
  readonly length: number;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
}

type StoredEnvelope = {
  schemaVersion: number;
  savedAt: string;
  payload: unknown;
};

type LegacyReadResult = {
  data: RepositoryData;
  discarded: DiscardedLegacyData;
};

const repositoryDataSchema = z.object({
  profile: onboardingDetailsSchema.nullable(),
  theme: themeSchema,
  books: bookSchema.array(),
  settings: appSettingsSchema,
  chapters: z.record(z.string(), chapterSchema.array()),
  characters: z.record(z.string(), characterSchema.array()),
});

const backupV2Schema = z.object({
  format: z.literal(awthorBackupFormat),
  version: z.literal(awthorBackupVersion),
  exportedAt: z.string(),
  data: repositoryDataSchema,
});

const backupV1Schema = z.object({
  format: z.literal(awthorBackupFormat),
  version: z.literal(1),
  exportedAt: z.string(),
  entries: z.record(z.string(), z.string()),
});

export class RepositoryStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RepositoryStorageError";
  }
}

function browserStorage(): StorageLike {
  if (typeof window === "undefined") {
    throw new RepositoryStorageError("Local Awthor data is only available in the browser.");
  }

  return window.localStorage;
}

function envelope(payload: unknown): StoredEnvelope {
  return {
    schemaVersion: repositorySchemaVersion,
    savedAt: new Date().toISOString(),
    payload,
  };
}

function stored(payload: unknown): string {
  return JSON.stringify(envelope(payload));
}

function normalizeStorageError(message: string, error: unknown): RepositoryStorageError {
  return error instanceof RepositoryStorageError
    ? error
    : new RepositoryStorageError(message, { cause: error });
}

function parseStoredValue<Value>(raw: string, schema: ZodType<Value>, key: string): Value {
  try {
    const parsed: unknown = JSON.parse(raw);
    const candidate =
      parsed && typeof parsed === "object" && "schemaVersion" in parsed && "payload" in parsed
        ? (parsed as StoredEnvelope).payload
        : parsed;
    const result = schema.safeParse(candidate);

    if (!result.success) {
      throw new RepositoryStorageError(`Local data for “${key}” is invalid.`, {
        cause: result.error,
      });
    }

    return result.data;
  } catch (error) {
    throw normalizeStorageError(`Local data for “${key}” could not be read.`, error);
  }
}

function listStorageKeys(storage: StorageLike): string[] {
  const keys: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key !== null) {
      keys.push(key);
    }
  }

  return keys;
}

function chapterKey(bookId: string, prefix = repositoryPrefix): string {
  return `${prefix}:chapters:${encodeURIComponent(bookId)}`;
}

function characterKey(bookId: string, prefix = repositoryPrefix): string {
  return `${prefix}:characters:${encodeURIComponent(bookId)}`;
}

function countDiscardedEntry(raw: string | undefined): number {
  if (!raw) {
    return 0;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const candidate =
      parsed && typeof parsed === "object" && "payload" in parsed
        ? (parsed as StoredEnvelope).payload
        : parsed;
    return Array.isArray(candidate) ? candidate.length : 0;
  } catch {
    return 0;
  }
}

function legacyEntriesFromStorage(storage: StorageLike): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const key of listStorageKeys(storage)) {
    if (key === legacyProfileStorageKey || key.startsWith(`${legacyRepositoryPrefix}:`)) {
      const value = storage.getItem(key);
      if (value !== null) {
        entries[key] = value;
      }
    }
  }

  const theme = storage.getItem(themeStorageKey);
  if (theme !== null) {
    entries[themeStorageKey] = theme;
  }

  return entries;
}

function parseLegacyEntries(entries: Readonly<Record<string, string>>): LegacyReadResult {
  const legacyBooksKey = `${legacyRepositoryPrefix}:books`;
  const rawBooks = entries[legacyBooksKey];
  const books = rawBooks ? parseStoredValue(rawBooks, bookSchema.array(), legacyBooksKey) : [];
  const rawProfile =
    entries[`${legacyRepositoryPrefix}:profile`] ?? entries[legacyProfileStorageKey];
  const rawSettings = entries[`${legacyRepositoryPrefix}:settings`];
  const chapters: Record<string, Chapter[]> = {};
  const characters: Record<string, Character[]> = {};
  let noteCount = 0;
  let plotCount = 0;

  for (const book of books) {
    const legacyChaptersKey = chapterKey(book.id, legacyRepositoryPrefix);
    const legacyCharactersKey = characterKey(book.id, legacyRepositoryPrefix);
    const rawChapters = entries[legacyChaptersKey];
    const rawCharacters = entries[legacyCharactersKey];

    chapters[book.id] = rawChapters
      ? parseStoredValue(rawChapters, chapterSchema.array(), legacyChaptersKey)
      : [];
    characters[book.id] = rawCharacters
      ? parseStoredValue(rawCharacters, characterSchema.array(), legacyCharactersKey)
      : [];

    noteCount += countDiscardedEntry(
      entries[`${legacyRepositoryPrefix}:notes:${encodeURIComponent(book.id)}`],
    );
    plotCount += countDiscardedEntry(
      entries[`${legacyRepositoryPrefix}:plots:${encodeURIComponent(book.id)}`],
    );
  }

  const rawTheme = entries[themeStorageKey];

  return {
    data: repositoryDataSchema.parse({
      profile: rawProfile
        ? parseStoredValue(rawProfile, onboardingDetailsSchema, legacyProfileStorageKey)
        : null,
      theme: rawTheme ? themeSchema.parse(rawTheme) : "paper",
      books,
      settings: rawSettings
        ? parseStoredValue(rawSettings, appSettingsSchema, `${legacyRepositoryPrefix}:settings`)
        : createDefaultAppSettings(),
      chapters,
      characters,
    }),
    discarded: { notes: noteCount, plots: plotCount },
  };
}

function v2EntriesForData(data: RepositoryData): Map<string, string> {
  const parsed = repositoryDataSchema.parse(data);
  const entries = new Map<string, string>([
    [themeStorageKey, parsed.theme],
    [booksKey, stored(parsed.books)],
    [settingsKey, stored(parsed.settings)],
  ]);

  if (parsed.profile) {
    entries.set(profileKey, stored(parsed.profile));
  }

  for (const book of parsed.books) {
    entries.set(chapterKey(book.id), stored(parsed.chapters[book.id] ?? []));
    entries.set(characterKey(book.id), stored(parsed.characters[book.id] ?? []));
  }

  return entries;
}

function restoreSnapshot(storage: StorageLike, snapshot: Map<string, string | null>): void {
  for (const [key, value] of snapshot) {
    if (value === null) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, value);
    }
  }
}

function mutateStorage(
  storage: StorageLike,
  writes: ReadonlyMap<string, string>,
  removals: readonly string[],
): void {
  const targets = new Set([...writes.keys(), ...removals]);
  const snapshot = new Map([...targets].map((key) => [key, storage.getItem(key)]));

  try {
    for (const [key, value] of writes) {
      storage.setItem(key, value);
    }

    for (const key of removals) {
      storage.removeItem(key);
    }
  } catch (error) {
    try {
      restoreSnapshot(storage, snapshot);
    } catch (rollbackError) {
      throw new RepositoryStorageError(
        "Local data could not be saved and the previous state could not be fully restored.",
        { cause: rollbackError },
      );
    }

    throw normalizeStorageError(
      "Local data could not be saved. Your previous data was restored.",
      error,
    );
  }
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `awthor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function slugify(value: string): string {
  return (
    value
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "untitled-book"
  );
}

function emptyChapter(number: number, input: CreateChapterInput = {}): Chapter {
  const now = new Date().toISOString();
  const title =
    input.title?.trim() || getLeadingMarkdownTitle(input.body ?? "") || `Chapter ${number}`;
  const body = withLeadingMarkdownTitle(input.body ?? "", title);
  const counts = countManuscript(body);

  return chapterSchema.parse({
    id: createId(),
    number,
    title,
    summary: "",
    status: "Draft",
    ...counts,
    pov: "",
    body,
    arc: createDefaultChapterArc(),
    createdAt: now,
    updatedAt: now,
  });
}

function aggregateBook(book: Book, chapters: readonly Chapter[], updatedAt: string): Book {
  const wordCount = chapters.reduce((total, chapter) => total + chapter.wordCount, 0);

  return bookSchema.parse({
    ...book,
    chapterCount: chapters.length,
    pageCount: wordCount === 0 ? 0 : Math.ceil(wordCount / 250),
    wordCount,
    characterCount: chapters.reduce((total, chapter) => total + chapter.characterCount, 0),
    characterCountWithSpaces: chapters.reduce(
      (total, chapter) => total + chapter.characterCountWithSpaces,
      0,
    ),
    updatedAt,
  });
}

type MutationQueue = <Value>(operation: () => Promise<Value>) => Promise<Value>;

class LocalValueRepository<Value> implements ValueRepository<Value> {
  constructor(
    private readonly keyName: string,
    private readonly schema: ZodType<Value>,
    private readonly getStorage: () => StorageLike,
    private readonly ready: () => Promise<void>,
    private readonly runMutation: MutationQueue,
  ) {}

  async get(): Promise<Value | null> {
    await this.ready();
    const raw = this.getStorage().getItem(this.keyName);
    return raw ? parseStoredValue(raw, this.schema, this.keyName) : null;
  }

  async save(value: Value): Promise<void> {
    await this.runMutation(async () => {
      await this.ready();
      const parsed = this.schema.parse(value);
      mutateStorage(this.getStorage(), new Map([[this.keyName, stored(parsed)]]), []);
    });
  }

  async clear(): Promise<void> {
    await this.runMutation(async () => {
      await this.ready();
      mutateStorage(this.getStorage(), new Map(), [this.keyName]);
    });
  }
}

class LocalThemeRepository implements ValueRepository<Theme> {
  constructor(
    private readonly getStorage: () => StorageLike,
    private readonly ready: () => Promise<void>,
    private readonly runMutation: MutationQueue,
  ) {}

  async get(): Promise<Theme | null> {
    await this.ready();
    const storage = this.getStorage();
    const raw = storage.getItem(themeStorageKey);
    const result = themeSchema.safeParse(raw);

    if (!result.success) {
      return null;
    }

    return result.data;
  }

  async save(value: Theme): Promise<void> {
    await this.runMutation(async () => {
      await this.ready();
      mutateStorage(this.getStorage(), new Map([[themeStorageKey, themeSchema.parse(value)]]), []);
    });
  }

  async clear(): Promise<void> {
    await this.runMutation(async () => {
      await this.ready();
      mutateStorage(this.getStorage(), new Map(), [themeStorageKey]);
    });
  }
}

class LocalScopedCollectionRepository<Entity extends { id: string }>
  implements ScopedCollectionRepository<Entity>
{
  constructor(
    private readonly namespace: "chapters" | "characters",
    private readonly schema: ZodType<Entity[]>,
    private readonly getStorage: () => StorageLike,
    private readonly ready: () => Promise<void>,
    private readonly runMutation: MutationQueue,
  ) {}

  async list(scopeId: string): Promise<Entity[] | null> {
    await this.ready();
    const key = this.key(scopeId);
    const raw = this.getStorage().getItem(key);
    return raw ? parseStoredValue(raw, this.schema, key) : null;
  }

  async replaceAll(scopeId: string, entities: readonly Entity[]): Promise<void> {
    await this.runMutation(async () => {
      await this.ready();
      const parsed = this.schema.parse(entities);
      mutateStorage(this.getStorage(), new Map([[this.key(scopeId), stored(parsed)]]), []);
    });
  }

  async clear(scopeId: string): Promise<void> {
    await this.runMutation(async () => {
      await this.ready();
      mutateStorage(this.getStorage(), new Map(), [this.key(scopeId)]);
    });
  }

  private key(scopeId: string): string {
    return `${repositoryPrefix}:${this.namespace}:${encodeURIComponent(scopeId)}`;
  }
}

class LocalAwthorRepository implements AwthorRepository {
  readonly profile: ValueRepository<OnboardingDetails>;
  readonly theme: ValueRepository<Theme>;
  readonly books: ValueRepository<Book[]>;
  readonly settings: ValueRepository<RepositoryData["settings"]>;
  readonly chapters: ScopedCollectionRepository<Chapter>;
  readonly characters: ScopedCollectionRepository<Character>;

  private initialization: Promise<MigrationResult> | undefined;
  private mutationTail: Promise<void> = Promise.resolve();

  constructor(private readonly getStorage: () => StorageLike) {
    const ready = () => this.requireReady();
    const runMutation: MutationQueue = (operation) => this.runMutation(operation);
    this.profile = new LocalValueRepository(
      profileKey,
      onboardingDetailsSchema,
      getStorage,
      ready,
      runMutation,
    );
    this.theme = new LocalThemeRepository(getStorage, ready, runMutation);
    this.books = new LocalValueRepository(
      booksKey,
      bookSchema.array(),
      getStorage,
      ready,
      runMutation,
    );
    this.settings = new LocalValueRepository(
      settingsKey,
      appSettingsSchema,
      getStorage,
      ready,
      runMutation,
    );
    this.chapters = new LocalScopedCollectionRepository(
      "chapters",
      chapterSchema.array(),
      getStorage,
      ready,
      runMutation,
    );
    this.characters = new LocalScopedCollectionRepository(
      "characters",
      characterSchema.array(),
      getStorage,
      ready,
      runMutation,
    );
  }

  initialize(): Promise<MigrationResult> {
    this.initialization ??= this.runMigration();
    return this.initialization;
  }

  retryMigration(): Promise<MigrationResult> {
    this.initialization = undefined;
    return this.initialize();
  }

  async createBook(input: CreateBookInput): Promise<Book> {
    return this.runMutation(async () => {
      const data = await this.getData();
      const now = new Date().toISOString();
      const bookId = createId();
      const chapter = emptyChapter(1);
      const seriesName = input.seriesName?.trim() ?? "";
      const book = aggregateBook(
        bookSchema.parse({
          id: bookId,
          slug: slugify(input.title),
          title: input.title.trim() || "Untitled book",
          author: input.author.trim(),
          coverUrl: sanitizeBookCoverUrl(input.coverUrl),
          genre: normalizeGenreCsv(input.genre ?? ""),
          isPartOfSeries: seriesName.length > 0,
          seriesName,
          createdAt: now,
          updatedAt: now,
        }),
        [chapter],
        now,
      );

      data.books.push(book);
      data.chapters[bookId] = [chapter];
      data.characters[bookId] = [];
      data.settings.activeBookId = bookId;
      data.settings.lastChapterByBook[bookId] = chapter.id;
      await this.replaceDataRaw(data);
      return book;
    });
  }

  async updateBook(bookId: string, input: UpdateBookInput): Promise<Book> {
    return this.runMutation(async () => {
      const data = await this.getData();
      const index = data.books.findIndex((book) => book.id === bookId);
      if (index < 0) {
        throw new RepositoryStorageError("This book no longer exists on this device.");
      }

      const current = data.books[index];
      const title =
        input.title === undefined ? current.title : input.title.trim() || "Untitled book";
      const author = input.author === undefined ? current.author : input.author.trim();
      const genre = input.genre === undefined ? current.genre : normalizeGenreCsv(input.genre);
      const seriesName =
        input.seriesName === undefined ? current.seriesName : input.seriesName.trim();
      const updated = bookSchema.parse({
        ...current,
        title,
        author,
        genre,
        coverUrl:
          input.coverUrl === undefined ? current.coverUrl : sanitizeBookCoverUrl(input.coverUrl),
        seriesName,
        isPartOfSeries: seriesName.length > 0,
        updatedAt: new Date().toISOString(),
      });

      data.books[index] = updated;
      await this.replaceDataRaw(data);
      return updated;
    });
  }

  async deleteBook(bookId: string): Promise<void> {
    await this.runMutation(async () => {
      const data = await this.getData();
      if (!data.books.some((book) => book.id === bookId)) {
        return;
      }

      data.books = data.books.filter((book) => book.id !== bookId);
      delete data.chapters[bookId];
      delete data.characters[bookId];
      delete data.settings.lastChapterByBook[bookId];
      delete data.settings.readingPositionByBook[bookId];
      delete data.settings.proofreadingByBook[bookId];
      if (data.settings.activeBookId === bookId) {
        data.settings.activeBookId = data.books[0]?.id ?? null;
      }
      await this.replaceDataRaw(data);
    });
  }

  async createChapter(bookId: string, input: CreateChapterInput = {}): Promise<Chapter> {
    return this.runMutation(async () => {
      const data = await this.getData();
      const bookIndex = this.requireBookIndex(data, bookId);
      const chapters = data.chapters[bookId] ?? [];
      const chapter = emptyChapter(chapters.length + 1, input);
      const nextChapters = [...chapters, chapter];
      data.chapters[bookId] = nextChapters;
      data.books[bookIndex] = aggregateBook(data.books[bookIndex], nextChapters, chapter.updatedAt);
      data.settings.lastChapterByBook[bookId] = chapter.id;
      await this.replaceDataRaw(data);
      return chapter;
    });
  }

  async updateChapter(
    bookId: string,
    chapterId: string,
    input: UpdateChapterInput,
  ): Promise<Chapter> {
    return this.runMutation(async () => {
      const data = await this.getData();
      const bookIndex = this.requireBookIndex(data, bookId);
      const chapters = data.chapters[bookId] ?? [];
      const chapterIndex = chapters.findIndex((chapter) => chapter.id === chapterId);
      if (chapterIndex < 0) {
        throw new RepositoryStorageError("This chapter no longer exists on this device.");
      }

      const now = new Date().toISOString();
      const current = chapters[chapterIndex];
      const explicitTitle =
        input.title?.trim() || (input.title === undefined ? null : "Untitled chapter");
      const body =
        explicitTitle === null
          ? (input.body ?? current.body)
          : withLeadingMarkdownTitle(input.body ?? current.body, explicitTitle);
      const bodyChanged = body !== current.body;
      const updated = chapterSchema.parse({
        ...current,
        ...input,
        ...(bodyChanged ? countManuscript(body) : {}),
        body,
        title: explicitTitle ?? getLeadingMarkdownTitle(body) ?? current.title,
        updatedAt: now,
      });
      const nextChapters = chapters.map((chapter, index) =>
        index === chapterIndex ? updated : chapter,
      );
      data.chapters[bookId] = nextChapters;
      data.books[bookIndex] = aggregateBook(data.books[bookIndex], nextChapters, now);
      await this.replaceDataRaw(data);
      return updated;
    });
  }

  async reorderChapters(bookId: string, orderedChapterIds: readonly string[]): Promise<Chapter[]> {
    return this.runMutation(async () => {
      const data = await this.getData();
      const bookIndex = this.requireBookIndex(data, bookId);
      const chapters = data.chapters[bookId] ?? [];
      if (
        orderedChapterIds.length !== chapters.length ||
        new Set(orderedChapterIds).size !== chapters.length
      ) {
        throw new RepositoryStorageError("The chapter order must include every chapter once.");
      }

      const byId = new Map(chapters.map((chapter) => [chapter.id, chapter]));
      const now = new Date().toISOString();
      const reordered = orderedChapterIds.map((id, index) => {
        const chapter = byId.get(id);
        if (!chapter) {
          throw new RepositoryStorageError("The chapter order contains an unknown chapter.");
        }
        return chapterSchema.parse({ ...chapter, number: index + 1, updatedAt: now });
      });
      data.chapters[bookId] = reordered;
      data.books[bookIndex] = aggregateBook(data.books[bookIndex], reordered, now);
      await this.replaceDataRaw(data);
      return reordered;
    });
  }

  async deleteChapter(bookId: string, chapterId: string): Promise<void> {
    await this.runMutation(async () => {
      const data = await this.getData();
      const bookIndex = this.requireBookIndex(data, bookId);
      const chapters = data.chapters[bookId] ?? [];
      if (chapters.length <= 1) {
        throw new RepositoryStorageError("A book must keep at least one chapter.");
      }
      if (!chapters.some((chapter) => chapter.id === chapterId)) {
        throw new RepositoryStorageError("This chapter no longer exists on this device.");
      }

      const now = new Date().toISOString();
      const remaining = chapters
        .filter((chapter) => chapter.id !== chapterId)
        .map((chapter, index) => chapterSchema.parse({ ...chapter, number: index + 1 }));
      data.chapters[bookId] = remaining;
      data.books[bookIndex] = aggregateBook(data.books[bookIndex], remaining, now);
      if (data.settings.lastChapterByBook[bookId] === chapterId) {
        data.settings.lastChapterByBook[bookId] = remaining[0].id;
      }
      await this.replaceDataRaw(data);
    });
  }

  saveManuscript(
    bookId: string,
    chapterId: string,
    markdown: string,
  ): Promise<ManuscriptSaveResult> {
    return this.runMutation(async () => {
      const data = await this.getData();
      const bookIndex = this.requireBookIndex(data, bookId);
      const chapters = data.chapters[bookId] ?? [];
      const chapterIndex = chapters.findIndex((chapter) => chapter.id === chapterId);
      if (chapterIndex < 0) {
        throw new RepositoryStorageError("This chapter no longer exists on this device.");
      }

      const now = new Date().toISOString();
      const chapter = chapterSchema.parse({
        ...chapters[chapterIndex],
        ...countManuscript(markdown),
        body: markdown,
        title: getLeadingMarkdownTitle(markdown) ?? chapters[chapterIndex].title,
        updatedAt: now,
      });
      const nextChapters = chapters.map((value, index) =>
        index === chapterIndex ? chapter : value,
      );
      const book = aggregateBook(data.books[bookIndex], nextChapters, now);
      data.chapters[bookId] = nextChapters;
      data.books[bookIndex] = book;
      await this.replaceDataRaw(data);
      return { book, chapter };
    });
  }

  async createCharacter(bookId: string, input: CreateCharacterInput): Promise<Character> {
    return this.runMutation(async () => {
      const data = await this.getData();
      this.requireBookIndex(data, bookId);
      const character = characterSchema.parse({ id: createId(), ...input });
      data.characters[bookId] = [...(data.characters[bookId] ?? []), character];
      await this.replaceDataRaw(data);
      return character;
    });
  }

  async updateCharacter(
    bookId: string,
    characterId: string,
    input: UpdateCharacterInput,
  ): Promise<Character> {
    return this.runMutation(async () => {
      const data = await this.getData();
      this.requireBookIndex(data, bookId);
      const characters = data.characters[bookId] ?? [];
      const index = characters.findIndex((character) => character.id === characterId);
      if (index < 0) {
        throw new RepositoryStorageError("This character no longer exists on this device.");
      }
      const updated = characterSchema.parse({ ...characters[index], ...input, id: characterId });
      data.characters[bookId] = characters.map((character, characterIndex) =>
        characterIndex === index ? updated : character,
      );
      await this.replaceDataRaw(data);
      return updated;
    });
  }

  async deleteCharacter(bookId: string, characterId: string): Promise<void> {
    await this.runMutation(async () => {
      const data = await this.getData();
      this.requireBookIndex(data, bookId);
      data.characters[bookId] = (data.characters[bookId] ?? []).filter(
        (character) => character.id !== characterId,
      );
      await this.replaceDataRaw(data);
    });
  }

  async getData(): Promise<RepositoryData> {
    await this.requireReady();
    const storage = this.getStorage();
    const rawBooks = storage.getItem(booksKey);
    const books = rawBooks ? parseStoredValue(rawBooks, bookSchema.array(), booksKey) : [];
    const rawProfile = storage.getItem(profileKey);
    const rawSettings = storage.getItem(settingsKey);
    const rawTheme = storage.getItem(themeStorageKey);
    const chapters: Record<string, Chapter[]> = {};
    const characters: Record<string, Character[]> = {};

    for (const book of books) {
      const rawChapters = storage.getItem(chapterKey(book.id));
      const rawCharacters = storage.getItem(characterKey(book.id));
      chapters[book.id] = rawChapters
        ? parseStoredValue(rawChapters, chapterSchema.array(), chapterKey(book.id))
        : [];
      characters[book.id] = rawCharacters
        ? parseStoredValue(rawCharacters, characterSchema.array(), characterKey(book.id))
        : [];
    }

    const data = repositoryDataSchema.parse({
      profile: rawProfile
        ? parseStoredValue(rawProfile, onboardingDetailsSchema, profileKey)
        : null,
      theme: rawTheme ? themeSchema.parse(rawTheme) : "paper",
      books,
      settings: rawSettings
        ? parseStoredValue(rawSettings, appSettingsSchema, settingsKey)
        : createDefaultAppSettings(),
      chapters,
      characters,
    });

    const normalizedBooks = data.books.map((book) =>
      aggregateBook(book, data.chapters[book.id] ?? [], book.updatedAt),
    );
    // Reads return repaired aggregates without writing. Any queued product mutation persists them
    // alongside its own atomic snapshot, avoiding a read-side write that could race the queue.
    data.books = normalizedBooks;

    return data;
  }

  async replaceData(data: RepositoryData): Promise<void> {
    await this.runMutation(async () => {
      await this.requireReady();
      await this.replaceDataRaw(data);
    });
  }

  async clearAll(): Promise<void> {
    await this.runMutation(async () => {
      const storage = this.getStorage();
      const keys = listStorageKeys(storage).filter(
        (key) =>
          key === themeStorageKey || key === legacyProfileStorageKey || key.startsWith("awthor:"),
      );
      mutateStorage(storage, new Map(), keys);
      this.initialization = undefined;
    });
  }

  async exportBackup(): Promise<AwthorBackupV2> {
    return {
      format: awthorBackupFormat,
      version: awthorBackupVersion,
      exportedAt: new Date().toISOString(),
      data: await this.getData(),
    };
  }

  async importBackup(backup: unknown): Promise<BackupImportResult> {
    const parsedV2 = backupV2Schema.safeParse(backup);
    if (parsedV2.success) {
      await this.runMutation(() => this.replaceDataRaw(parsedV2.data.data));
      this.initialization = Promise.resolve({
        status: "not-needed",
        retryable: false,
        discarded: { notes: 0, plots: 0 },
      });
      return { importedVersion: 2, discarded: { notes: 0, plots: 0 } };
    }

    const parsedV1 = backupV1Schema.safeParse(backup);
    if (!parsedV1.success) {
      throw new RepositoryStorageError("The selected file is not a valid Awthor v1 or v2 backup.", {
        cause: parsedV2.error,
      });
    }

    const migrated = parseLegacyEntries(parsedV1.data.entries);
    await this.runMutation(() => this.replaceDataRaw(migrated.data));
    this.initialization = Promise.resolve({
      status: "not-needed",
      retryable: false,
      discarded: migrated.discarded,
    });
    return { importedVersion: 1, discarded: migrated.discarded };
  }

  private async requireReady(): Promise<void> {
    const result = await this.initialize();
    if (result.status === "failed") {
      throw result.error;
    }
  }

  private async runMigration(): Promise<MigrationResult> {
    const discarded = { notes: 0, plots: 0 };

    try {
      const storage = this.getStorage();
      const legacyEntries = legacyEntriesFromStorage(storage);
      const legacyKeys = Object.keys(legacyEntries).filter((key) => key !== themeStorageKey);

      if (legacyKeys.length === 0) {
        return { status: "not-needed", retryable: false, discarded };
      }

      const migrated = parseLegacyEntries(legacyEntries);
      const writes = v2EntriesForData(migrated.data);
      const currentV2Keys = listStorageKeys(storage).filter((key) =>
        key.startsWith(`${repositoryPrefix}:`),
      );
      const staleV2Keys = currentV2Keys.filter((key) => !writes.has(key));

      // Legacy deletion is deliberately in the removal phase, after every v2 write succeeds.
      mutateStorage(storage, writes, [...staleV2Keys, ...legacyKeys]);
      return { status: "migrated", retryable: false, discarded: migrated.discarded };
    } catch (error) {
      return {
        status: "failed",
        retryable: true,
        discarded,
        error: normalizeStorageError(
          "Awthor could not upgrade local data. Nothing was deleted; retry when storage is available.",
          error,
        ),
      };
    }
  }

  private async replaceDataRaw(data: RepositoryData): Promise<void> {
    const storage = this.getStorage();
    const writes = v2EntriesForData(data);
    const staleKeys = listStorageKeys(storage).filter(
      (key) =>
        (key.startsWith(`${repositoryPrefix}:`) && !writes.has(key)) ||
        key.startsWith(`${legacyRepositoryPrefix}:`) ||
        key === legacyProfileStorageKey ||
        (key === profileKey && data.profile === null),
    );
    mutateStorage(storage, writes, staleKeys);
  }

  private requireBookIndex(data: RepositoryData, bookId: string): number {
    const index = data.books.findIndex((book) => book.id === bookId);
    if (index < 0) {
      throw new RepositoryStorageError("This book no longer exists on this device.");
    }
    return index;
  }

  private runMutation<Value>(operation: () => Promise<Value>): Promise<Value> {
    const result = this.mutationTail.then(operation, operation);
    this.mutationTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

export function createLocalAwthorRepository(
  getStorage: () => StorageLike = browserStorage,
): AwthorRepository {
  return new LocalAwthorRepository(getStorage);
}
