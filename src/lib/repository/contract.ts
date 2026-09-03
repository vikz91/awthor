import type { AppSettings, Book, Chapter, Character, OnboardingDetails, Theme } from "./models";

export interface ValueRepository<Value> {
  get(): Promise<Value | null>;
  save(value: Value): Promise<void>;
  clear(): Promise<void>;
}

export interface ScopedCollectionRepository<Entity extends { id: string }> {
  list(scopeId: string): Promise<Entity[] | null>;
  replaceAll(scopeId: string, entities: readonly Entity[]): Promise<void>;
  clear(scopeId: string): Promise<void>;
}

export type DiscardedLegacyData = {
  notes: number;
  plots: number;
};

export type MigrationResult =
  | {
      status: "not-needed" | "migrated";
      retryable: false;
      discarded: DiscardedLegacyData;
    }
  | {
      status: "failed";
      retryable: true;
      discarded: DiscardedLegacyData;
      error: Error;
    };

export type RepositoryData = {
  profile: OnboardingDetails | null;
  theme: Theme;
  books: Book[];
  settings: AppSettings;
  chapters: Record<string, Chapter[]>;
  characters: Record<string, Character[]>;
};

export const awthorBackupFormat = "awthor-local-storage-backup" as const;
export const awthorBackupVersion = 2 as const;

export type AwthorBackupV2 = {
  format: typeof awthorBackupFormat;
  version: typeof awthorBackupVersion;
  exportedAt: string;
  data: RepositoryData;
};

export type BackupImportResult = {
  importedVersion: 1 | 2;
  discarded: DiscardedLegacyData;
};

export type CreateBookInput = {
  title: string;
  author: string;
  coverUrl?: string | null;
  /** A CSV-formatted list; legacy single-genre values remain valid. */
  genre?: string;
  seriesName?: string;
};

export type UpdateBookInput = Partial<CreateBookInput>;

export type CreateChapterInput = {
  title?: string;
  body?: string;
};

export type UpdateChapterInput = Partial<
  Pick<Chapter, "title" | "summary" | "status" | "pov" | "body" | "arc">
>;

export type CreateCharacterInput = Partial<Omit<Character, "id">> & Pick<Character, "name">;
export type UpdateCharacterInput = Partial<Omit<Character, "id">>;

export type ManuscriptSaveResult = {
  book: Book;
  chapter: Chapter;
};

/**
 * The single data boundary used by all product and diagnostics features.
 *
 * A cloud or offline-first implementation only needs to satisfy this contract;
 * pages and workspaces must never depend on browser storage directly.
 */
export interface AwthorRepository {
  profile: ValueRepository<OnboardingDetails>;
  theme: ValueRepository<Theme>;
  books: ValueRepository<Book[]>;
  settings: ValueRepository<AppSettings>;
  chapters: ScopedCollectionRepository<Chapter>;
  characters: ScopedCollectionRepository<Character>;

  initialize(): Promise<MigrationResult>;
  retryMigration(): Promise<MigrationResult>;

  createBook(input: CreateBookInput): Promise<Book>;
  updateBook(bookId: string, input: UpdateBookInput): Promise<Book>;
  deleteBook(bookId: string): Promise<void>;

  createChapter(bookId: string, input?: CreateChapterInput): Promise<Chapter>;
  updateChapter(bookId: string, chapterId: string, input: UpdateChapterInput): Promise<Chapter>;
  reorderChapters(bookId: string, orderedChapterIds: readonly string[]): Promise<Chapter[]>;
  deleteChapter(bookId: string, chapterId: string): Promise<void>;
  saveManuscript(
    bookId: string,
    chapterId: string,
    markdown: string,
  ): Promise<ManuscriptSaveResult>;

  createCharacter(bookId: string, input: CreateCharacterInput): Promise<Character>;
  updateCharacter(
    bookId: string,
    characterId: string,
    input: UpdateCharacterInput,
  ): Promise<Character>;
  deleteCharacter(bookId: string, characterId: string): Promise<void>;

  getData(): Promise<RepositoryData>;
  replaceData(data: RepositoryData): Promise<void>;
  clearAll(): Promise<void>;
  exportBackup(): Promise<AwthorBackupV2>;
  importBackup(backup: unknown): Promise<BackupImportResult>;
}
