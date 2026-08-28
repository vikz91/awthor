import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { z } from "zod";
import {
  type AwthorBackupV2,
  awthorBackupFormat,
  awthorBackupVersion,
  type RepositoryData,
} from "../repository/contract";
import {
  appSettingsSchema,
  bookSchema,
  chapterSchema,
  characterSchema,
  onboardingDetailsSchema,
  themeSchema,
} from "../repository/models";

export const awthorArchiveFormat = "awthor-backup-archive" as const;
export const awthorArchiveVersion = 1 as const;
export const maxBackupFileBytes = 10 * 1024 * 1024;
export const maxUncompressedBackupBytes = 50 * 1024 * 1024;

const archiveFiles = {
  indexedDb: "indexeddb.json",
  localStorage: "local-storage.json",
  manifest: "manifest.json",
} as const;

const repositoryDataSchema = z.object({
  profile: onboardingDetailsSchema.nullable(),
  theme: themeSchema,
  books: bookSchema.array(),
  settings: appSettingsSchema,
  chapters: z.record(z.string(), chapterSchema.array()),
  characters: z.record(z.string(), characterSchema.array()),
});

const portableBackupSchema = z.object({
  format: z.literal(awthorBackupFormat),
  version: z.literal(awthorBackupVersion),
  exportedAt: z.string(),
  data: repositoryDataSchema,
});

const legacyBackupSchema = z.object({
  format: z.literal(awthorBackupFormat),
  version: z.literal(1),
  exportedAt: z.string(),
  entries: z.record(z.string(), z.string()),
});

const archiveManifestSchema = z.object({
  format: z.literal(awthorArchiveFormat),
  version: z.literal(awthorArchiveVersion),
  exportedAt: z.string(),
  payloadFormat: z.literal(awthorBackupFormat),
  payloadVersion: z.literal(awthorBackupVersion),
  files: z.object({
    indexedDb: z.literal(archiveFiles.indexedDb),
    localStorage: z.literal(archiveFiles.localStorage),
  }),
});

const indexedDbSnapshotSchema = z.object({
  books: bookSchema.array(),
  chapters: z.record(z.string(), chapterSchema.array()),
  characters: z.record(z.string(), characterSchema.array()),
});

const localStorageSnapshotSchema = z.object({
  profile: onboardingDetailsSchema.nullable(),
  theme: themeSchema,
  settings: appSettingsSchema,
});

export type BackupSummary = {
  books: number;
  chapters: number;
  characters: number;
};

export type ParsedBackupFile = {
  backup: unknown;
  exportedAt: string;
  kind: "archive" | "json-v1" | "json-v2";
  summary: BackupSummary | null;
};

export class BackupArchiveError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "BackupArchiveError";
  }
}

function encodeJson(value: unknown): Uint8Array {
  return strToU8(JSON.stringify(value, null, 2));
}

function parseJson(bytes: Uint8Array, filename: string): unknown {
  try {
    return JSON.parse(strFromU8(bytes)) as unknown;
  } catch (error) {
    throw new BackupArchiveError(`${filename} is not valid JSON.`, { cause: error });
  }
}

function summarize(data: RepositoryData): BackupSummary {
  return {
    books: data.books.length,
    chapters: Object.values(data.chapters).reduce((total, chapters) => total + chapters.length, 0),
    characters: Object.values(data.characters).reduce(
      (total, characters) => total + characters.length,
      0,
    ),
  };
}

function isZip(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    ((bytes[2] === 0x03 && bytes[3] === 0x04) ||
      (bytes[2] === 0x05 && bytes[3] === 0x06) ||
      (bytes[2] === 0x07 && bytes[3] === 0x08))
  );
}

export function backupArchiveFilename(exportedAt: string): string {
  const exportedDate = new Date(exportedAt);
  const timestamp = Number.isNaN(exportedDate.getTime())
    ? "undated"
    : exportedDate
        .toISOString()
        .replace(/\.\d{3}Z$/, "Z")
        .replaceAll(":", "-");
  return `awthor-backup-${timestamp}.awthor.zip`;
}

export function createBackupArchive(backup: AwthorBackupV2): Uint8Array {
  const parsed = portableBackupSchema.parse(backup);
  const manifest = archiveManifestSchema.parse({
    format: awthorArchiveFormat,
    version: awthorArchiveVersion,
    exportedAt: parsed.exportedAt,
    payloadFormat: parsed.format,
    payloadVersion: parsed.version,
    files: {
      indexedDb: archiveFiles.indexedDb,
      localStorage: archiveFiles.localStorage,
    },
  });

  return zipSync(
    {
      [archiveFiles.manifest]: encodeJson(manifest),
      [archiveFiles.indexedDb]: encodeJson({
        books: parsed.data.books,
        chapters: parsed.data.chapters,
        characters: parsed.data.characters,
      }),
      [archiveFiles.localStorage]: encodeJson({
        profile: parsed.data.profile,
        theme: parsed.data.theme,
        settings: parsed.data.settings,
      }),
    },
    { level: 6 },
  );
}

function parseArchive(bytes: Uint8Array): ParsedBackupFile {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch (error) {
    throw new BackupArchiveError("This Awthor ZIP archive could not be opened.", {
      cause: error,
    });
  }

  const expectedFiles = Object.values(archiveFiles).sort();
  const actualFiles = Object.keys(files).sort();
  if (
    expectedFiles.length !== actualFiles.length ||
    expectedFiles.some((filename, index) => filename !== actualFiles[index])
  ) {
    throw new BackupArchiveError(
      "This archive must contain manifest.json, indexeddb.json, and local-storage.json.",
    );
  }

  const uncompressedBytes = Object.values(files).reduce(
    (total, file) => total + file.byteLength,
    0,
  );
  if (uncompressedBytes > maxUncompressedBackupBytes) {
    throw new BackupArchiveError("The uncompressed backup is larger than 50 MB.");
  }

  try {
    const manifest = archiveManifestSchema.parse(
      parseJson(files[archiveFiles.manifest], archiveFiles.manifest),
    );
    const indexedDb = indexedDbSnapshotSchema.parse(
      parseJson(files[archiveFiles.indexedDb], archiveFiles.indexedDb),
    );
    const localStorage = localStorageSnapshotSchema.parse(
      parseJson(files[archiveFiles.localStorage], archiveFiles.localStorage),
    );
    const backup = portableBackupSchema.parse({
      format: manifest.payloadFormat,
      version: manifest.payloadVersion,
      exportedAt: manifest.exportedAt,
      data: {
        ...indexedDb,
        ...localStorage,
      },
    });

    return {
      backup,
      exportedAt: backup.exportedAt,
      kind: "archive",
      summary: summarize(backup.data),
    };
  } catch (error) {
    if (error instanceof BackupArchiveError) {
      throw error;
    }
    throw new BackupArchiveError("This Awthor archive contains invalid or unsupported data.", {
      cause: error,
    });
  }
}

function parseLegacyJson(bytes: Uint8Array): ParsedBackupFile {
  const candidate = parseJson(bytes, "The selected backup");
  const portable = portableBackupSchema.safeParse(candidate);
  if (portable.success) {
    return {
      backup: portable.data,
      exportedAt: portable.data.exportedAt,
      kind: "json-v2",
      summary: summarize(portable.data.data),
    };
  }

  const legacy = legacyBackupSchema.safeParse(candidate);
  if (legacy.success) {
    return {
      backup: legacy.data,
      exportedAt: legacy.data.exportedAt,
      kind: "json-v1",
      summary: null,
    };
  }

  throw new BackupArchiveError("This is not a supported Awthor backup.");
}

export function parseBackupFile(bytes: Uint8Array): ParsedBackupFile {
  if (bytes.byteLength === 0) {
    throw new BackupArchiveError("The selected backup is empty.");
  }
  if (bytes.byteLength > maxBackupFileBytes) {
    throw new BackupArchiveError("Backup files must be smaller than 10 MB.");
  }

  return isZip(bytes) ? parseArchive(bytes) : parseLegacyJson(bytes);
}
