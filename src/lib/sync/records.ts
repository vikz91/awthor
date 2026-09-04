import {
  appSettingsSchema,
  bookSchema,
  chapterSchema,
  characterSchema,
  onboardingDetailsSchema,
  type RepositoryData,
  themeSchema,
} from "@/lib/repository";
import {
  type ReadingProgressPayload,
  readingProgressPayloadSchema,
  type SyncDeviceState,
  type SyncedRecord,
  type SyncRecord,
  type SyncRecordState,
  type SyncRecordType,
} from "./types";

const syncedSettingsSchema = appSettingsSchema.pick({
  editor: true,
  notebookModeByBook: true,
  proofreadingByBook: true,
});

/** Server revisions resolve versions, not parent-child dependencies. */
const syncApplicationOrder: Record<SyncRecordType, number> = {
  profile: 0,
  theme: 1,
  settings: 2,
  progress: 3,
  book: 4,
  chapter: 5,
  character: 5,
};

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

export type SyncDeletion = {
  recordId: string;
  recordType: SyncRecordType;
};

/** Records a deletion only when the product explicitly reports one. */
export async function queueSyncDeletions(
  state: SyncDeviceState,
  deletions: readonly SyncDeletion[],
  now: string,
): Promise<SyncDeviceState> {
  const nextState: SyncDeviceState = {
    ...state,
    pendingDeletes: { ...state.pendingDeletes },
    records: { ...state.records },
  };

  for (const deletion of deletions) {
    const key = recordKey(deletion.recordType, deletion.recordId);
    if (nextState.pendingDeletes[key]) continue;
    const contentHash = await createSyncContentHash(null);
    nextState.pendingDeletes[key] = {
      baseCursor: state.cursor,
      contentHash,
      deleted: true,
      deviceId: state.deviceId,
      modifiedAt: now,
      recordId: deletion.recordId,
      recordType: deletion.recordType,
    };
  }

  return nextState;
}

function currentRecords(data: RepositoryData) {
  const records: Array<Pick<SyncRecord, "payload" | "recordId" | "recordType">> = [];
  if (data.profile)
    records.push({ payload: data.profile, recordId: "profile", recordType: "profile" });
  records.push({ payload: data.theme, recordId: "theme", recordType: "theme" });
  records.push({
    payload: syncedSettingsSchema.parse(data.settings),
    recordId: "settings",
    recordType: "settings",
  });
  records.push({
    payload: { activeBookId: data.settings.activeBookId, kind: "active" },
    recordId: "active",
    recordType: "progress",
  });

  for (const book of data.books) {
    records.push({
      payload: {
        bookId: book.id,
        chapterId: data.settings.lastChapterByBook[book.id] ?? null,
        kind: "book",
        position: data.settings.readingPositionByBook[book.id] ?? 0,
      },
      recordId: book.id,
      recordType: "progress",
    });
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
 * IndexedDB keeps chapter order unique per book. Concurrent chapter creation
 * can legitimately produce the same number in independent local workspaces,
 * so repair the merged order before it reaches the local database. The changed
 * chapters retain a fresh timestamp and are sent back as the next canonical
 * sync delta.
 */
function normalizeChapterNumbers(chaptersByBook: RepositoryData["chapters"]): boolean {
  let changed = false;
  const normalizedAt = new Date().toISOString();

  for (const chapters of Object.values(chaptersByBook)) {
    chapters.sort(
      (left, right) =>
        left.number - right.number ||
        left.updatedAt.localeCompare(right.updatedAt) ||
        left.id.localeCompare(right.id),
    );
    for (const [index, chapter] of chapters.entries()) {
      const number = index + 1;
      if (chapter.number === number) continue;
      chapters[index] = chapterSchema.parse({ ...chapter, number, updatedAt: normalizedAt });
      changed = true;
    }
  }

  return changed;
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
  const nextState: SyncDeviceState = {
    ...state,
    pendingDeletes: { ...state.pendingDeletes },
    records: { ...state.records },
  };
  const changedRecords: SyncRecord[] = [];

  for (const record of records) {
    const key = recordKey(record.recordType, record.recordId);
    currentKeys.add(key);
    const existing = nextState.records[key];
    if (nextState.pendingDeletes[key]) {
      delete nextState.pendingDeletes[key];
    }
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

  for (const [key, deletion] of Object.entries(nextState.pendingDeletes)) {
    if (currentKeys.has(key)) continue;
    const changed: SyncRecord = { ...deletion, payload: null };
    nextState.records[key] = toState(changed);
    changedRecords.push(changed);
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
  const nextState: SyncDeviceState = {
    ...currentState,
    pendingDeletes: { ...currentState.pendingDeletes },
    records: { ...currentState.records },
  };
  const books = new Map(next.books.map((book) => [book.id, book]));
  let changed = false;
  const orderedRecords = [...canonicalRecords].sort(
    (left, right) => syncApplicationOrder[left.recordType] - syncApplicationOrder[right.recordType],
  );

  for (const remote of orderedRecords) {
    const key = recordKey(remote.recordType, remote.recordId);
    const local = nextState.records[key];
    if (local && compareSyncRecords(local, remote) > 0) continue;
    nextState.records[key] = toState(remote);
    if (remote.deleted) {
      delete nextState.pendingDeletes[key];
    }
    const localRecordIsMissing = isLocalRecordMissing(next, books, remote);
    if (
      local &&
      local.deleted === remote.deleted &&
      local.contentHash !== "" &&
      local.contentHash === remote.contentHash &&
      !localRecordIsMissing
    ) {
      continue;
    }
    changed = true;

    if (remote.recordType === "profile") {
      next.profile = remote.deleted ? null : onboardingDetailsSchema.parse(remote.payload);
    } else if (remote.recordType === "theme" && !remote.deleted) {
      next.theme = themeSchema.parse(remote.payload);
    } else if (remote.recordType === "settings" && !remote.deleted) {
      next.settings = appSettingsSchema.parse({
        ...next.settings,
        ...syncedSettingsSchema.parse(remote.payload),
      });
    } else if (remote.recordType === "progress") {
      applyReadingProgressRecord(next, remote);
    } else if (remote.recordType === "book") {
      if (remote.deleted) {
        books.delete(remote.recordId);
        delete next.chapters[remote.recordId];
        delete next.characters[remote.recordId];
        delete next.settings.lastChapterByBook[remote.recordId];
        delete next.settings.notebookModeByBook[remote.recordId];
        delete next.settings.readingPositionByBook[remote.recordId];
        delete next.settings.proofreadingByBook[remote.recordId];
        if (next.settings.activeBookId === remote.recordId) {
          next.settings.activeBookId = books.values().next().value?.id ?? null;
        }
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
  changed = normalizeChapterNumbers(next.chapters) || changed;
  return { changed, data: next, state: nextState };
}

function isLocalRecordMissing(
  data: RepositoryData,
  books: ReadonlyMap<string, unknown>,
  record: SyncedRecord,
) {
  if (record.deleted) return false;
  if (record.recordType === "profile") return data.profile === null;
  if (record.recordType === "progress") {
    const payload = readingProgressPayloadSchema.parse(record.payload);
    if (payload.kind === "active") return data.settings.activeBookId !== payload.activeBookId;
    return (
      data.settings.lastChapterByBook[payload.bookId] !== payload.chapterId ||
      data.settings.readingPositionByBook[payload.bookId] !== payload.position
    );
  }
  if (record.recordType === "book") return !books.has(record.recordId);
  if (record.recordType === "chapter") {
    const bookId =
      (record.payload as { bookId?: string } | null)?.bookId ?? record.recordId.split(":", 1)[0];
    const chapterId = record.recordId.split(":").at(-1);
    return !(data.chapters[bookId] ?? []).some((chapter) => chapter.id === chapterId);
  }
  if (record.recordType === "character") {
    const bookId =
      (record.payload as { bookId?: string } | null)?.bookId ?? record.recordId.split(":", 1)[0];
    const characterId = record.recordId.split(":").at(-1);
    return !(data.characters[bookId] ?? []).some((character) => character.id === characterId);
  }
  return false;
}

function applyReadingProgressRecord(data: RepositoryData, record: SyncedRecord): void {
  if (record.deleted) {
    if (record.recordId === "active") {
      data.settings.activeBookId = null;
      return;
    }
    delete data.settings.lastChapterByBook[record.recordId];
    delete data.settings.readingPositionByBook[record.recordId];
    if (data.settings.activeBookId === record.recordId) data.settings.activeBookId = null;
    return;
  }

  const payload: ReadingProgressPayload = readingProgressPayloadSchema.parse(record.payload);
  if (payload.kind === "active") {
    data.settings.activeBookId = payload.activeBookId;
    return;
  }

  if (payload.chapterId === null) {
    delete data.settings.lastChapterByBook[payload.bookId];
  } else {
    data.settings.lastChapterByBook[payload.bookId] = payload.chapterId;
  }
  data.settings.readingPositionByBook[payload.bookId] = payload.position;
}
