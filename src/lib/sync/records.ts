import {
  appSettingsSchema,
  bookSchema,
  chapterSchema,
  characterSchema,
  onboardingDetailsSchema,
  type RepositoryData,
  themeSchema,
} from "@/lib/repository";
import type { SyncDeviceState, SyncedRecord, SyncRecord, SyncRecordState } from "./types";

function recordKey(recordType: SyncRecord["recordType"], recordId: string) {
  return `${recordType}:${recordId}`;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`)
    .join(",")}}`;
}

/** A stable SHA-256 fingerprint used only for sync change detection. */
export async function createSyncContentHash(payload: unknown): Promise<string> {
  const data = new TextEncoder().encode(stableJson(payload));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

function toState(record: Pick<SyncRecord, keyof SyncRecordState>): SyncRecordState {
  return {
    contentHash: record.contentHash,
    deleted: record.deleted,
    deviceId: record.deviceId,
    modifiedAt: record.modifiedAt,
    recordId: record.recordId,
    recordType: record.recordType,
  };
}

function currentRecords(data: RepositoryData) {
  const records: Array<Pick<SyncRecord, "payload" | "recordId" | "recordType">> = [];
  if (data.profile)
    records.push({ payload: data.profile, recordId: "profile", recordType: "profile" });
  records.push({ payload: data.theme, recordId: "theme", recordType: "theme" });
  const { backupReminder: _backupReminder, ...settings } = data.settings;
  records.push({ payload: settings, recordId: "settings", recordType: "settings" });

  for (const book of data.books) {
    records.push({ payload: book, recordId: book.id, recordType: "book" });
    for (const chapter of data.chapters[book.id] ?? []) {
      records.push({
        payload: { ...chapter, bookId: book.id },
        recordId: `${book.id}:${chapter.id}`,
        recordType: "chapter",
      });
    }
    for (const character of data.characters[book.id] ?? []) {
      records.push({
        payload: { ...character, bookId: book.id },
        recordId: `${book.id}:${character.id}`,
        recordType: "character",
      });
    }
  }
  return records;
}

/**
 * Builds only records changed since the previous successful snapshot. Device
 * state retains lightweight versions and hashes, never duplicate manuscripts.
 */
export async function createSyncSnapshot(
  data: RepositoryData,
  state: SyncDeviceState,
  now: string,
) {
  const records = currentRecords(data);
  const currentKeys = new Set<string>();
  const nextState: SyncDeviceState = { ...state, records: { ...state.records } };
  const changedRecords: SyncRecord[] = [];

  for (const record of records) {
    const key = recordKey(record.recordType, record.recordId);
    currentKeys.add(key);
    const existing = nextState.records[key];
    const contentHash = await createSyncContentHash(record.payload);
    if (!existing || existing.deleted || existing.contentHash !== contentHash) {
      const sourceUpdatedAt =
        record.payload && typeof record.payload === "object" && "updatedAt" in record.payload
          ? (record.payload as { updatedAt?: unknown }).updatedAt
          : null;
      const changed: SyncRecord = {
        contentHash,
        deleted: false,
        deviceId: state.deviceId,
        modifiedAt: typeof sourceUpdatedAt === "string" ? sourceUpdatedAt : now,
        payload: record.payload,
        recordId: record.recordId,
        recordType: record.recordType,
      };
      nextState.records[key] = toState(changed);
      changedRecords.push(changed);
    }
  }

  for (const [key, existing] of Object.entries(nextState.records)) {
    if (!currentKeys.has(key) && !existing.deleted) {
      const changed: SyncRecord = {
        contentHash: await createSyncContentHash(null),
        deleted: true,
        deviceId: state.deviceId,
        modifiedAt: now,
        payload: null,
        recordId: existing.recordId,
        recordType: existing.recordType,
      };
      nextState.records[key] = toState(changed);
      changedRecords.push(changed);
    }
  }

  return { changedRecords, state: nextState };
}

export function compareSyncRecords(
  left: Pick<SyncRecord, "deviceId" | "modifiedAt">,
  right: Pick<SyncRecord, "deviceId" | "modifiedAt">,
) {
  const dateOrder = left.modifiedAt.localeCompare(right.modifiedAt);
  if (dateOrder !== 0) return dateOrder;
  return left.deviceId.localeCompare(right.deviceId);
}

/** Applies canonical remote records while retaining an edit made after the snapshot was taken. */
export function applySyncRecords(
  data: RepositoryData,
  currentState: SyncDeviceState,
  canonicalRecords: readonly SyncedRecord[],
) {
  const next = structuredClone(data);
  const nextState: SyncDeviceState = { ...currentState, records: { ...currentState.records } };
  const books = new Map(next.books.map((book) => [book.id, book]));
  let changed = false;

  for (const remote of canonicalRecords) {
    const key = recordKey(remote.recordType, remote.recordId);
    const local = nextState.records[key];
    if (local && compareSyncRecords(local, remote) > 0) continue;
    nextState.records[key] = toState(remote);
    if (
      local &&
      local.deleted === remote.deleted &&
      local.contentHash !== "" &&
      local.contentHash === remote.contentHash
    ) {
      continue;
    }
    changed = true;

    if (remote.recordType === "profile") {
      next.profile = remote.deleted ? null : onboardingDetailsSchema.parse(remote.payload);
    } else if (remote.recordType === "theme" && !remote.deleted) {
      next.theme = themeSchema.parse(remote.payload);
    } else if (remote.recordType === "settings" && !remote.deleted) {
      const { backupReminder } = next.settings;
      next.settings = { ...appSettingsSchema.parse(remote.payload), backupReminder };
    } else if (remote.recordType === "book") {
      if (remote.deleted) {
        books.delete(remote.recordId);
        delete next.chapters[remote.recordId];
        delete next.characters[remote.recordId];
      } else {
        books.set(remote.recordId, bookSchema.parse(remote.payload));
        next.chapters[remote.recordId] ??= [];
        next.characters[remote.recordId] ??= [];
      }
    } else if (remote.recordType === "chapter") {
      const payload = remote.payload as { bookId?: string } | null;
      const bookId = payload?.bookId ?? remote.recordId.split(":", 1)[0];
      if (!books.has(bookId)) continue;
      const current = next.chapters[bookId] ?? [];
      next.chapters[bookId] = remote.deleted
        ? current.filter((chapter) => chapter.id !== remote.recordId.split(":").at(-1))
        : [
            ...current.filter((chapter) => chapter.id !== remote.recordId.split(":").at(-1)),
            chapterSchema.parse(payload),
          ];
    } else if (remote.recordType === "character") {
      const payload = remote.payload as { bookId?: string } | null;
      const bookId = payload?.bookId ?? remote.recordId.split(":", 1)[0];
      if (!books.has(bookId)) continue;
      const current = next.characters[bookId] ?? [];
      next.characters[bookId] = remote.deleted
        ? current.filter((character) => character.id !== remote.recordId.split(":").at(-1))
        : [
            ...current.filter((character) => character.id !== remote.recordId.split(":").at(-1)),
            characterSchema.parse(payload),
          ];
    }
  }

  next.books = [...books.values()];
  for (const values of Object.values(next.chapters))
    values.sort((left, right) => left.number - right.number);
  return { changed, data: next, state: nextState };
}
