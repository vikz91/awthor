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
  type ManuscriptSaveResult,
  type MigrationResult,
  type RepositoryData,
  type RepositoryMutationOptions,
  type ScopedCollectionRepository,
  type UpdateBookInput,
  type UpdateChapterInput,
  type UpdateCharacterInput,
  type ValueRepository,
} from "./contract";
import {
  createLocalAwthorRepository,
  legacyRepositoryPrefix,
  repositoryPrefix as localRepositoryPrefix,
  RepositoryStorageError,
  type StorageLike,
  themeStorageKey,
} from "./local-repository";
import {
  appSettingsSchema,
  type Book,
  type BookProofreadingSettings,
  bookProofreadingSettingsSchema,
  bookSchema,
  type Chapter,
  type Character,
  chapterSchema,
  characterSchema,
  createDefaultChapterArc,
  type OnboardingDetails,
  onboardingDetailsSchema,
  type Theme,
  themeSchema,
} from "./models";
import { announceRepositoryMutation } from "./mutation-events";

export const indexedDbRepositorySchemaVersion = 3;
export const indexedDbRepositoryPrefix = `awthor:repository:v${indexedDbRepositorySchemaVersion}`;
export const indexedDbDatabaseName = "awthor";
export const repositoryDeletedEventName = "awthor:repository-deleted";

const databaseVersion = 1;
const profileKey = `${indexedDbRepositoryPrefix}:profile`;
const settingsKey = `${indexedDbRepositoryPrefix}:settings`;
const migrationKey = `${indexedDbRepositoryPrefix}:indexeddb-ready`;
const legacyProfileStorageKey = "awthor:onboarding:v1";

const storeNames = {
  books: "books",
  chapters: "chapters",
  characters: "characters",
  bookSettings: "bookSettings",
} as const;

type StoreName = (typeof storeNames)[keyof typeof storeNames];
type MutationQueueOptions<Value> = RepositoryMutationOptions & {
  shouldAnnounce?: (value: Value) => boolean;
};
type MutationQueue = <Value>(
  operation: () => Promise<Value>,
  options?: MutationQueueOptions<Value>,
) => Promise<Value>;

type StoredEnvelope = {
  schemaVersion: number;
  savedAt: string;
  payload: unknown;
};

type StoredChapter = Chapter & { bookId: string };
type StoredCharacter = Character & { bookId: string };
type RepositoryDeletedRecord = {
  recordId: string;
  recordType: "book" | "chapter" | "character" | "progress";
};
type BookSettingsRecord = {
  bookId: string;
  lastChapterId: string | null;
  readingPosition: number | null;
  proofreading: BookProofreadingSettings | null;
};

const storedChapterSchema = chapterSchema.and(z.object({ bookId: z.string().min(1) }));
const storedCharacterSchema = characterSchema.and(z.object({ bookId: z.string().min(1) }));
const bookSettingsRecordSchema = z.object({
  bookId: z.string().min(1),
  lastChapterId: z.string().nullable(),
  readingPosition: z.number().finite().min(0).max(1).nullable(),
  proofreading: bookProofreadingSettingsSchema.nullable(),
});
const globalSettingsSchema = appSettingsSchema.pick({
  activeBookId: true,
  editor: true,
  backupReminder: true,
});
const repositoryDataSchema = z.object({
  profile: onboardingDetailsSchema.nullable(),
  theme: themeSchema,
  books: bookSchema.array(),
  settings: appSettingsSchema,
  chapters: z.record(z.string(), chapterSchema.array()),
  characters: z.record(z.string(), characterSchema.array()),
});

type GlobalSettings = z.infer<typeof globalSettingsSchema>;

export type IndexedDbAwthorRepositoryOptions = {
  databaseName?: string;
  getIndexedDb?: () => IDBFactory;
  getStorage?: () => StorageLike;
};

function browserStorage(): StorageLike {
  if (typeof window === "undefined") {
    throw new RepositoryStorageError("Local Awthor data is only available in the browser.");
  }
  return window.localStorage;
}

function browserIndexedDb(): IDBFactory {
  if (typeof window === "undefined" || !window.indexedDB) {
    throw new RepositoryStorageError("IndexedDB is not available in this browser.");
  }
  return window.indexedDB;
}

function stored(payload: unknown): string {
  return JSON.stringify({
    schemaVersion: indexedDbRepositorySchemaVersion,
    savedAt: new Date().toISOString(),
    payload,
  } satisfies StoredEnvelope);
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function entityCollectionsEqual<Entity extends { id: string }>(
  left: readonly Entity[],
  right: readonly Entity[],
): boolean {
  if (left.length !== right.length) return false;
  const rightById = new Map(right.map((entity) => [entity.id, entity]));
  return left.every((entity) => valuesEqual(entity, rightById.get(entity.id)));
}

function parseStoredValue<Value>(raw: string, schema: ZodType<Value>, key: string): Value {
  try {
    const parsed: unknown = JSON.parse(raw);
    const candidate =
      parsed && typeof parsed === "object" && "payload" in parsed
        ? (parsed as StoredEnvelope).payload
        : parsed;
    return schema.parse(candidate);
  } catch (error) {
    throw new RepositoryStorageError(`Local data for “${key}” could not be read.`, {
      cause: error,
    });
  }
}

function normalizeStorageError(message: string, error: unknown): RepositoryStorageError {
  return error instanceof RepositoryStorageError
    ? error
    : new RepositoryStorageError(message, { cause: error });
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

function mutateLocalStorage(
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
    for (const [key, value] of snapshot) {
      if (value === null) {
        storage.removeItem(key);
      } else {
        storage.setItem(key, value);
      }
    }
    throw normalizeStorageError("Local settings could not be saved.", error);
  }
}

function announceDeletedRecords(records: readonly RepositoryDeletedRecord[]) {
  if (records.length > 0 && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<readonly RepositoryDeletedRecord[]>(repositoryDeletedEventName, {
        detail: records,
      }),
    );
  }
}

function requestResult<Value>(request: IDBRequest<Value>): Promise<Value> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction was aborted."));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
  });
}

function openDatabase(factory: IDBFactory, name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, databaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;
      const transaction = request.transaction;
      if (!transaction) {
        throw new RepositoryStorageError("IndexedDB upgrade transaction is unavailable.");
      }

      if (!database.objectStoreNames.contains(storeNames.books)) {
        database.createObjectStore(storeNames.books, { keyPath: "id" });
      }

      const chapters = database.objectStoreNames.contains(storeNames.chapters)
        ? transaction.objectStore(storeNames.chapters)
        : database.createObjectStore(storeNames.chapters, { keyPath: "id" });
      if (!chapters.indexNames.contains("bookId")) {
        chapters.createIndex("bookId", "bookId", { unique: false });
      }
      if (!chapters.indexNames.contains("bookOrder")) {
        chapters.createIndex("bookOrder", ["bookId", "number"], { unique: true });
      }

      const characters = database.objectStoreNames.contains(storeNames.characters)
        ? transaction.objectStore(storeNames.characters)
        : database.createObjectStore(storeNames.characters, { keyPath: "id" });
      if (!characters.indexNames.contains("bookId")) {
        characters.createIndex("bookId", "bookId", { unique: false });
      }

      if (!database.objectStoreNames.contains(storeNames.bookSettings)) {
        database.createObjectStore(storeNames.bookSettings, { keyPath: "bookId" });
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () =>
      reject(request.error ?? new RepositoryStorageError("IndexedDB could not be opened."));
    request.onblocked = () =>
      reject(
        new RepositoryStorageError(
          "Awthor storage is open in another tab. Close the other tab and retry.",
        ),
      );
  });
}

async function getAll<Value>(database: IDBDatabase, storeName: StoreName): Promise<Value[]> {
  const transaction = database.transaction(storeName, "readonly");
  const done = transactionDone(transaction);
  const result = await requestResult(transaction.objectStore(storeName).getAll());
  await done;
  return result as Value[];
}

async function getScoped<Value>(
  database: IDBDatabase,
  storeName: typeof storeNames.chapters | typeof storeNames.characters,
  bookId: string,
): Promise<Value[]> {
  const transaction = database.transaction(storeName, "readonly");
  const done = transactionDone(transaction);
  const result = await requestResult(
    transaction.objectStore(storeName).index("bookId").getAll(bookId),
  );
  await done;
  return result as Value[];
}

async function replaceStore<Value>(
  database: IDBDatabase,
  storeName: StoreName,
  values: readonly Value[],
): Promise<void> {
  const transaction = database.transaction(storeName, "readwrite");
  const done = transactionDone(transaction);
  const store = transaction.objectStore(storeName);
  store.clear();
  for (const value of values) {
    store.put(value);
  }
  await done;
}

function replaceScopedStore<Value>(
  database: IDBDatabase,
  storeName: typeof storeNames.chapters | typeof storeNames.characters,
  bookId: string,
  values: readonly Value[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const cursorRequest = store.index("bookId").openKeyCursor(bookId);

    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
        return;
      }
      for (const value of values) {
        store.put(value);
      }
    };
    cursorRequest.onerror = () =>
      reject(cursorRequest.error ?? new Error("IndexedDB cursor failed."));
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction was aborted."));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
  });
}

function splitSettings(settings: RepositoryData["settings"]): {
  global: GlobalSettings;
  books: BookSettingsRecord[];
} {
  const parsed = appSettingsSchema.parse(settings);
  const bookIds = new Set([
    ...Object.keys(parsed.lastChapterByBook),
    ...Object.keys(parsed.readingPositionByBook),
    ...Object.keys(parsed.proofreadingByBook),
  ]);

  return {
    global: globalSettingsSchema.parse(parsed),
    books: [...bookIds].map((bookId) =>
      bookSettingsRecordSchema.parse({
        bookId,
        lastChapterId: parsed.lastChapterByBook[bookId] ?? null,
        readingPosition: parsed.readingPositionByBook[bookId] ?? null,
        proofreading: parsed.proofreadingByBook[bookId] ?? null,
      }),
    ),
  };
}

function mergeSettings(
  global: GlobalSettings | null,
  books: readonly BookSettingsRecord[],
): RepositoryData["settings"] {
  const settings = appSettingsSchema.parse(global ?? {});
  for (const record of books) {
    const parsed = bookSettingsRecordSchema.parse(record);
    if (parsed.lastChapterId !== null) {
      settings.lastChapterByBook[parsed.bookId] = parsed.lastChapterId;
    }
    if (parsed.readingPosition !== null) {
      settings.readingPositionByBook[parsed.bookId] = parsed.readingPosition;
    }
    if (parsed.proofreading !== null) {
      settings.proofreadingByBook[parsed.bookId] = parsed.proofreading;
    }
  }
  return settings;
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
  return chapterSchema.parse({
    id: createId(),
    number,
    title,
    summary: "",
    status: "Draft",
    ...countManuscript(body),
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

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }
}

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

  async save(value: Value, options?: RepositoryMutationOptions): Promise<void> {
    await this.runMutation(
      async () => {
        await this.ready();
        const parsed = this.schema.parse(value);
        const storage = this.getStorage();
        const raw = storage.getItem(this.keyName);
        if (raw && valuesEqual(parseStoredValue(raw, this.schema, this.keyName), parsed)) {
          return false;
        }
        mutateLocalStorage(storage, new Map([[this.keyName, stored(parsed)]]), []);
        return true;
      },
      { ...options, shouldAnnounce: Boolean },
    );
  }

  async clear(): Promise<void> {
    await this.runMutation(
      async () => {
        await this.ready();
        const storage = this.getStorage();
        if (storage.getItem(this.keyName) === null) return false;
        mutateLocalStorage(storage, new Map(), [this.keyName]);
        return true;
      },
      {
        reason: "value-cleared",
        shouldAnnounce: Boolean,
        syncPolicy: "immediate",
      },
    );
  }
}

class HybridThemeRepository implements ValueRepository<Theme> {
  constructor(
    private readonly getStorage: () => StorageLike,
    private readonly ready: () => Promise<void>,
    private readonly runMutation: MutationQueue,
  ) {}

  async get(): Promise<Theme | null> {
    await this.ready();
    const parsed = themeSchema.safeParse(this.getStorage().getItem(themeStorageKey));
    return parsed.success ? parsed.data : null;
  }

  async save(value: Theme, options?: RepositoryMutationOptions): Promise<void> {
    await this.runMutation(
      async () => {
        await this.ready();
        const parsed = themeSchema.parse(value);
        const storage = this.getStorage();
        if (storage.getItem(themeStorageKey) === parsed) return false;
        mutateLocalStorage(storage, new Map([[themeStorageKey, parsed]]), []);
        return true;
      },
      { ...options, shouldAnnounce: Boolean },
    );
  }

  async clear(): Promise<void> {
    await this.runMutation(
      async () => {
        await this.ready();
        const storage = this.getStorage();
        if (storage.getItem(themeStorageKey) === null) return false;
        mutateLocalStorage(storage, new Map(), [themeStorageKey]);
        return true;
      },
      {
        reason: "theme-cleared",
        shouldAnnounce: Boolean,
        syncPolicy: "immediate",
      },
    );
  }
}

class IndexedDbCollectionRepository<Entity extends { id: string }>
  implements ScopedCollectionRepository<Entity>
{
  constructor(
    private readonly storeName: typeof storeNames.chapters | typeof storeNames.characters,
    private readonly schema: ZodType<Entity[]>,
    private readonly database: () => Promise<IDBDatabase>,
    private readonly ready: () => Promise<void>,
    private readonly runMutation: MutationQueue,
  ) {}

  async list(scopeId: string): Promise<Entity[] | null> {
    await this.ready();
    const records = await getScoped<Entity & { bookId: string }>(
      await this.database(),
      this.storeName,
      scopeId,
    );
    const entities = this.schema.parse(records.map(({ bookId: _bookId, ...entity }) => entity));
    if (this.storeName === storeNames.chapters) {
      entities.sort((left, right) => {
        const leftChapter = left as unknown as Chapter;
        const rightChapter = right as unknown as Chapter;
        return leftChapter.number - rightChapter.number;
      });
    }
    return entities;
  }

  async replaceAll(scopeId: string, entities: readonly Entity[]): Promise<void> {
    await this.runMutation(
      async () => {
        await this.ready();
        const parsed = this.schema.parse(entities);
        const database = await this.database();
        const storedEntities = await getScoped<Entity & { bookId: string }>(
          database,
          this.storeName,
          scopeId,
        );
        const current = this.schema.parse(
          storedEntities.map(({ bookId: _bookId, ...entity }) => entity),
        );
        if (entityCollectionsEqual(current, parsed)) return false;
        await replaceScopedStore(
          database,
          this.storeName,
          scopeId,
          parsed.map((entity) => ({ ...entity, bookId: scopeId })),
        );
        return true;
      },
      { shouldAnnounce: Boolean },
    );
  }

  async clear(scopeId: string): Promise<void> {
    await this.runMutation(
      async () => {
        await this.ready();
        const database = await this.database();
        const current = await getScoped<Entity & { bookId: string }>(
          database,
          this.storeName,
          scopeId,
        );
        if (current.length === 0) return false;
        await replaceScopedStore(database, this.storeName, scopeId, []);
        return true;
      },
      {
        reason: `${this.storeName}-cleared`,
        shouldAnnounce: Boolean,
        syncPolicy: "immediate",
      },
    );
  }
}

class IndexedDbAwthorRepository implements AwthorRepository {
  readonly profile: ValueRepository<OnboardingDetails>;
  readonly theme: ValueRepository<Theme>;
  readonly books: ValueRepository<Book[]>;
  readonly settings: ValueRepository<RepositoryData["settings"]>;
  readonly chapters: ScopedCollectionRepository<Chapter>;
  readonly characters: ScopedCollectionRepository<Character>;

  private initialization: Promise<MigrationResult> | undefined;
  private databasePromise: Promise<IDBDatabase> | undefined;
  private mutationTail: Promise<void> = Promise.resolve();

  constructor(private readonly options: Required<IndexedDbAwthorRepositoryOptions>) {
    const ready = () => this.requireReady();
    const runMutation: MutationQueue = (operation, options) => this.runMutation(operation, options);
    const database = () => this.database();

    this.profile = new LocalValueRepository(
      profileKey,
      onboardingDetailsSchema,
      options.getStorage,
      ready,
      runMutation,
    );
    this.theme = new HybridThemeRepository(options.getStorage, ready, runMutation);
    this.books = {
      get: async () => {
        await ready();
        return bookSchema.array().parse(await getAll<Book>(await database(), storeNames.books));
      },
      save: async (books, mutationOptions) => {
        await runMutation(
          async () => {
            await ready();
            const parsed = bookSchema.array().parse(books);
            const db = await database();
            const current = bookSchema.array().parse(await getAll<Book>(db, storeNames.books));
            if (entityCollectionsEqual(current, parsed)) return false;
            await replaceStore(db, storeNames.books, parsed);
            return true;
          },
          { ...mutationOptions, shouldAnnounce: Boolean },
        );
      },
      clear: async () => {
        await runMutation(
          async () => {
            await ready();
            const db = await database();
            if ((await getAll<Book>(db, storeNames.books)).length === 0) return false;
            await replaceStore(db, storeNames.books, []);
            return true;
          },
          { reason: "books-cleared", shouldAnnounce: Boolean, syncPolicy: "immediate" },
        );
      },
    };
    this.settings = {
      get: async () => {
        await ready();
        return this.readSettingsRaw();
      },
      save: async (settings, mutationOptions) => {
        await runMutation(
          async () => {
            await ready();
            const parsed = appSettingsSchema.parse(settings);
            if (valuesEqual(await this.readSettingsRaw(), parsed)) return false;
            await this.saveSettingsRaw(parsed);
            return true;
          },
          { ...mutationOptions, shouldAnnounce: Boolean },
        );
      },
      clear: async () => {
        await runMutation(
          async () => {
            await ready();
            const current = await this.readSettingsRaw();
            if (valuesEqual(current, appSettingsSchema.parse({}))) return false;
            mutateLocalStorage(options.getStorage(), new Map(), [settingsKey]);
            await replaceStore(await database(), storeNames.bookSettings, []);
            return true;
          },
          { reason: "settings-cleared", shouldAnnounce: Boolean, syncPolicy: "immediate" },
        );
      },
    };
    this.chapters = new IndexedDbCollectionRepository(
      storeNames.chapters,
      chapterSchema.array(),
      database,
      ready,
      runMutation,
    );
    this.characters = new IndexedDbCollectionRepository(
      storeNames.characters,
      characterSchema.array(),
      database,
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
      await this.requireReady();
      const data = await this.getDataRaw();
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
      await this.requireReady();
      const data = await this.getDataRaw();
      const index = this.requireBookIndex(data, bookId);
      const current = data.books[index];
      const title =
        input.title === undefined ? current.title : input.title.trim() || "Untitled book";
      const genre = input.genre === undefined ? current.genre : normalizeGenreCsv(input.genre);
      const seriesName =
        input.seriesName === undefined ? current.seriesName : input.seriesName.trim();
      const updated = bookSchema.parse({
        ...current,
        title,
        author: input.author === undefined ? current.author : input.author.trim(),
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
    const deletedRecords: RepositoryDeletedRecord[] = [];
    await this.runMutation(
      async () => {
        await this.requireReady();
        const data = await this.getDataRaw();
        if (!data.books.some((book) => book.id === bookId)) {
          return false;
        }
        deletedRecords.push(
          { recordId: bookId, recordType: "book" },
          { recordId: bookId, recordType: "progress" },
          ...(data.chapters[bookId] ?? []).map((chapter) => ({
            recordId: `${bookId}:${chapter.id}`,
            recordType: "chapter" as const,
          })),
          ...(data.characters[bookId] ?? []).map((character) => ({
            recordId: `${bookId}:${character.id}`,
            recordType: "character" as const,
          })),
        );
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
        return true;
      },
      { reason: "book-deleted", shouldAnnounce: Boolean, syncPolicy: "immediate" },
    );
    announceDeletedRecords(deletedRecords);
  }

  async createChapter(bookId: string, input: CreateChapterInput = {}): Promise<Chapter> {
    return this.runMutation(async () => {
      await this.requireReady();
      const data = await this.getDataRaw();
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
      await this.requireReady();
      const data = await this.getDataRaw();
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
      const updated = chapterSchema.parse({
        ...current,
        ...input,
        ...(body === current.body ? {} : countManuscript(body)),
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
      await this.requireReady();
      const data = await this.getDataRaw();
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
    await this.runMutation(
      async () => {
        await this.requireReady();
        const data = await this.getDataRaw();
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
      },
      { reason: "chapter-deleted", syncPolicy: "immediate" },
    );
    announceDeletedRecords([{ recordId: `${bookId}:${chapterId}`, recordType: "chapter" }]);
  }

  saveManuscript(
    bookId: string,
    chapterId: string,
    markdown: string,
  ): Promise<ManuscriptSaveResult> {
    let mutated = false;
    return this.runMutation(
      async () => {
        await this.requireReady();
        const database = await this.database();
        const booksTransaction = database.transaction(storeNames.books, "readonly");
        const booksDone = transactionDone(booksTransaction);
        const book = bookSchema.parse(
          await requestResult(booksTransaction.objectStore(storeNames.books).get(bookId)),
        );
        await booksDone;
        const storedChapters = storedChapterSchema
          .array()
          .parse(await getScoped<StoredChapter>(database, storeNames.chapters, bookId));
        const chapterIndex = storedChapters.findIndex((chapter) => chapter.id === chapterId);
        if (chapterIndex < 0) {
          throw new RepositoryStorageError("This chapter no longer exists on this device.");
        }
        if (storedChapters[chapterIndex].body === markdown) {
          const { bookId: _bookId, ...storedChapter } = storedChapters[chapterIndex];
          return { book, chapter: chapterSchema.parse(storedChapter) };
        }

        const now = new Date().toISOString();
        const chapter = chapterSchema.parse({
          ...storedChapters[chapterIndex],
          ...countManuscript(markdown),
          body: markdown,
          title: getLeadingMarkdownTitle(markdown) ?? storedChapters[chapterIndex].title,
          updatedAt: now,
        });
        const chapters = storedChapters.map(({ bookId: _bookId, ...value }, index) =>
          index === chapterIndex ? chapter : chapterSchema.parse(value),
        );
        const updatedBook = aggregateBook(book, chapters, now);

        const transaction = database.transaction(
          [storeNames.books, storeNames.chapters],
          "readwrite",
        );
        const done = transactionDone(transaction);
        transaction.objectStore(storeNames.books).put(updatedBook);
        transaction.objectStore(storeNames.chapters).put({ ...chapter, bookId });
        await done;
        mutated = true;
        return { book: updatedBook, chapter };
      },
      { reason: "manuscript-saved", shouldAnnounce: () => mutated },
    );
  }

  async createCharacter(bookId: string, input: CreateCharacterInput): Promise<Character> {
    return this.runMutation(async () => {
      await this.requireReady();
      const data = await this.getDataRaw();
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
      await this.requireReady();
      const data = await this.getDataRaw();
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
    let deleted = false;
    await this.runMutation(
      async () => {
        await this.requireReady();
        const data = await this.getDataRaw();
        this.requireBookIndex(data, bookId);
        const characters = data.characters[bookId] ?? [];
        deleted = characters.some((character) => character.id === characterId);
        if (!deleted) return false;
        data.characters[bookId] = characters.filter((character) => character.id !== characterId);
        await this.replaceDataRaw(data);
        return true;
      },
      { reason: "character-deleted", shouldAnnounce: Boolean, syncPolicy: "immediate" },
    );
    if (deleted) {
      announceDeletedRecords([{ recordId: `${bookId}:${characterId}`, recordType: "character" }]);
    }
  }

  async getData(): Promise<RepositoryData> {
    await this.requireReady();
    return this.getDataRaw();
  }

  async replaceData(data: RepositoryData): Promise<void> {
    await this.runMutation(
      async () => {
        await this.requireReady();
        await this.replaceDataRaw(data);
      },
      { reason: "repository-replaced", syncPolicy: "immediate" },
    );
  }

  async clearAll(): Promise<void> {
    await this.runMutation(
      async () => {
        const existingData = await this.getDataRaw();
        const hasData =
          existingData.profile !== null ||
          existingData.books.length > 0 ||
          this.options.getStorage().getItem(themeStorageKey) !== null ||
          this.options.getStorage().getItem(settingsKey) !== null;
        if (!hasData) return false;
        const database = await this.database();
        const transaction = database.transaction(Object.values(storeNames), "readwrite");
        const done = transactionDone(transaction);
        for (const name of Object.values(storeNames)) {
          transaction.objectStore(name).clear();
        }
        await done;

        const storage = this.options.getStorage();
        const removals = listStorageKeys(storage).filter(
          (key) =>
            key === themeStorageKey || key === legacyProfileStorageKey || key.startsWith("awthor:"),
        );
        mutateLocalStorage(storage, new Map(), removals);
        this.initialization = undefined;
        return true;
      },
      { reason: "repository-cleared", shouldAnnounce: Boolean, syncPolicy: "immediate" },
    );
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
    const temporaryStorage = new MemoryStorage();
    const temporaryRepository = createLocalAwthorRepository(() => temporaryStorage);
    await temporaryRepository.initialize();
    const result = await temporaryRepository.importBackup(backup);
    const data = await temporaryRepository.getData();
    await this.replaceData(data);
    return result;
  }

  private database(): Promise<IDBDatabase> {
    this.databasePromise ??= openDatabase(
      this.options.getIndexedDb(),
      this.options.databaseName,
    ).catch((error) => {
      this.databasePromise = undefined;
      throw normalizeStorageError("Awthor could not open its local book database.", error);
    });
    return this.databasePromise;
  }

  private async getDataRaw(): Promise<RepositoryData> {
    const database = await this.database();
    const [books, storedChapters, storedCharacters, bookSettings] = await Promise.all([
      getAll<Book>(database, storeNames.books),
      getAll<StoredChapter>(database, storeNames.chapters),
      getAll<StoredCharacter>(database, storeNames.characters),
      getAll<BookSettingsRecord>(database, storeNames.bookSettings),
    ]);
    const storage = this.options.getStorage();
    const rawProfile = storage.getItem(profileKey);
    const rawGlobalSettings = storage.getItem(settingsKey);
    const rawTheme = storage.getItem(themeStorageKey);
    const chapters: Record<string, Chapter[]> = {};
    const characters: Record<string, Character[]> = {};

    for (const book of books) {
      chapters[book.id] = [];
      characters[book.id] = [];
    }
    for (const record of storedChapterSchema.array().parse(storedChapters)) {
      if (chapters[record.bookId]) {
        const { bookId: _bookId, ...chapter } = record;
        chapters[record.bookId].push(chapterSchema.parse(chapter));
      }
    }
    for (const record of storedCharacterSchema.array().parse(storedCharacters)) {
      if (characters[record.bookId]) {
        const { bookId: _bookId, ...character } = record;
        characters[record.bookId].push(characterSchema.parse(character));
      }
    }
    for (const values of Object.values(chapters)) {
      values.sort((left, right) => left.number - right.number);
    }

    const parsedBooks = bookSchema.array().parse(books);
    return repositoryDataSchema.parse({
      profile: rawProfile
        ? parseStoredValue(rawProfile, onboardingDetailsSchema, profileKey)
        : null,
      theme: rawTheme ? themeSchema.parse(rawTheme) : "paper",
      books: parsedBooks.map((book) =>
        aggregateBook(book, chapters[book.id] ?? [], book.updatedAt),
      ),
      settings: mergeSettings(
        rawGlobalSettings
          ? parseStoredValue(rawGlobalSettings, globalSettingsSchema, settingsKey)
          : null,
        bookSettings,
      ),
      chapters,
      characters,
    });
  }

  private async replaceDataRaw(data: RepositoryData): Promise<void> {
    const parsed = repositoryDataSchema.parse(data);
    const database = await this.database();
    const settings = splitSettings(parsed.settings);
    const transaction = database.transaction(Object.values(storeNames), "readwrite");
    const done = transactionDone(transaction);

    for (const name of Object.values(storeNames)) {
      transaction.objectStore(name).clear();
    }
    for (const book of parsed.books) {
      transaction.objectStore(storeNames.books).put(book);
      for (const chapter of parsed.chapters[book.id] ?? []) {
        transaction.objectStore(storeNames.chapters).put({ ...chapter, bookId: book.id });
      }
      for (const character of parsed.characters[book.id] ?? []) {
        transaction.objectStore(storeNames.characters).put({ ...character, bookId: book.id });
      }
    }
    for (const record of settings.books) {
      transaction.objectStore(storeNames.bookSettings).put(record);
    }
    await done;

    const writes = new Map<string, string>([
      [themeStorageKey, parsed.theme],
      [settingsKey, stored(settings.global)],
    ]);
    if (parsed.profile) {
      writes.set(profileKey, stored(parsed.profile));
    }
    mutateLocalStorage(this.options.getStorage(), writes, parsed.profile ? [] : [profileKey]);
  }

  private async readSettingsRaw(): Promise<RepositoryData["settings"]> {
    const storage = this.options.getStorage();
    const raw = storage.getItem(settingsKey);
    const global = raw ? parseStoredValue(raw, globalSettingsSchema, settingsKey) : null;
    const records = bookSettingsRecordSchema
      .array()
      .parse(await getAll<BookSettingsRecord>(await this.database(), storeNames.bookSettings));
    return mergeSettings(global, records);
  }

  private async saveSettingsRaw(settings: RepositoryData["settings"]): Promise<void> {
    const split = splitSettings(settings);
    await replaceStore(await this.database(), storeNames.bookSettings, split.books);
    mutateLocalStorage(
      this.options.getStorage(),
      new Map([[settingsKey, stored(split.global)]]),
      [],
    );
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
      const storage = this.options.getStorage();
      const marker = storage.getItem(migrationKey);
      if (marker === "ready") {
        await this.database();
        return { status: "not-needed", retryable: false, discarded };
      }

      const oldKeysBeforeMigration = listStorageKeys(storage).filter(
        (key) =>
          key === legacyProfileStorageKey ||
          key.startsWith(`${legacyRepositoryPrefix}:`) ||
          key.startsWith(`${localRepositoryPrefix}:`),
      );
      const legacyRepository = createLocalAwthorRepository(this.options.getStorage);
      const legacyMigration = await legacyRepository.initialize();
      if (legacyMigration.status === "failed") {
        return legacyMigration;
      }
      const data = await legacyRepository.getData();
      await this.replaceDataRaw(data);
      const oldKeysAfterMigration = listStorageKeys(storage).filter(
        (key) =>
          key === legacyProfileStorageKey ||
          key.startsWith(`${legacyRepositoryPrefix}:`) ||
          key.startsWith(`${localRepositoryPrefix}:`),
      );
      mutateLocalStorage(storage, new Map([[migrationKey, "ready"]]), oldKeysAfterMigration);

      return {
        status: oldKeysBeforeMigration.length > 0 ? "migrated" : "not-needed",
        retryable: false,
        discarded: legacyMigration.discarded,
      };
    } catch (error) {
      return {
        status: "failed",
        retryable: true,
        discarded,
        error: normalizeStorageError(
          "Awthor could not move local books into IndexedDB. Existing browser data was kept.",
          error,
        ),
      };
    }
  }

  private requireBookIndex(data: RepositoryData, bookId: string): number {
    const index = data.books.findIndex((book) => book.id === bookId);
    if (index < 0) {
      throw new RepositoryStorageError("This book no longer exists on this device.");
    }
    return index;
  }

  private runMutation<Value>(
    operation: () => Promise<Value>,
    options: MutationQueueOptions<Value> = {},
  ): Promise<Value> {
    const result = this.mutationTail.then(operation, operation);
    this.mutationTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result.then((value) => {
      if (options.shouldAnnounce?.(value) ?? true) {
        announceRepositoryMutation(options);
      }
      return value;
    });
  }
}

export function createIndexedDbAwthorRepository(
  options: IndexedDbAwthorRepositoryOptions = {},
): AwthorRepository {
  return new IndexedDbAwthorRepository({
    databaseName: options.databaseName ?? indexedDbDatabaseName,
    getIndexedDb: options.getIndexedDb ?? browserIndexedDb,
    getStorage: options.getStorage ?? browserStorage,
  });
}
