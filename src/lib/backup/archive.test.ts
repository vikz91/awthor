import { describe, expect, test } from "bun:test";
import { strToU8, unzipSync, zipSync } from "fflate";
import { awthorBackupFormat, awthorBackupVersion, createSeedRepositoryData } from "../repository";
import {
  BackupArchiveError,
  backupArchiveFilename,
  createBackupArchive,
  parseBackupFile,
} from "./archive";

const exportedAt = "2026-08-28T09:30:00.000Z";
const backup = {
  format: awthorBackupFormat,
  version: awthorBackupVersion,
  exportedAt,
  data: createSeedRepositoryData(exportedAt),
};

describe("Awthor ZIP backups", () => {
  test("splits the canonical repository backup and restores it losslessly", () => {
    const archive = createBackupArchive(backup);
    const files = unzipSync(archive);

    expect(Object.keys(files).sort()).toEqual([
      "indexeddb.json",
      "local-storage.json",
      "manifest.json",
    ]);

    const parsed = parseBackupFile(archive);
    expect(parsed.kind).toBe("archive");
    expect(parsed.backup).toEqual(backup);
    expect(parsed.summary).toEqual({ books: 2, chapters: 6, characters: 4 });
    expect(backupArchiveFilename(exportedAt)).toBe("awthor-backup-2026-08-28T09-30-00Z.awthor.zip");
  });

  test("continues to accept portable v2 JSON backups", () => {
    const parsed = parseBackupFile(strToU8(JSON.stringify(backup)));

    expect(parsed.kind).toBe("json-v2");
    expect(parsed.backup).toEqual(backup);
    expect(parsed.summary?.books).toBe(2);
  });

  test("continues to pass supported v1 JSON backups to the repository migrator", () => {
    const legacy = {
      format: awthorBackupFormat,
      version: 1,
      exportedAt,
      entries: { "awthor:onboarding:v1": "{}" },
    };

    const parsed = parseBackupFile(strToU8(JSON.stringify(legacy)));
    expect(parsed.kind).toBe("json-v1");
    expect(parsed.backup).toEqual(legacy);
    expect(parsed.summary).toBeNull();
  });

  test("rejects incomplete and unrelated archives", () => {
    const invalid = zipSync({ "manifest.json": strToU8("{}") });

    expect(() => parseBackupFile(invalid)).toThrow(BackupArchiveError);
    expect(() => parseBackupFile(strToU8('{"hello":"world"}'))).toThrow(
      "This is not a supported Awthor backup.",
    );
  });
});
