import { describe, expect, test } from "bun:test";
import { createSeedRepositoryData } from "@/lib/repository";
import { createSyncDeviceState } from "./device-state";
import {
  applySyncRecords,
  compareSyncRecords,
  createSyncSnapshot,
  queueSyncDeletions,
} from "./records";

describe("sync records", () => {
  test("syncs only editor and proofreading preferences from settings", async () => {
    const data = createSeedRepositoryData();
    data.settings.activeBookId = "device-local-book";
    data.settings.lastChapterByBook = { "device-local-book": "device-local-chapter" };
    data.settings.readingPositionByBook = { "device-local-book": 0.75 };
    data.settings.backupReminder = {
      enabled: false,
      frequency: "weekly",
      lastShownAt: "2026-01-01T00:00:00.000Z",
    };

    const snapshot = await createSyncSnapshot(
      data,
      createSyncDeviceState("device-a"),
      "2026-01-01T00:00:00.000Z",
    );
    const settings = snapshot.changedRecords.find((record) => record.recordType === "settings");

    expect(settings?.payload).toEqual({
      editor: data.settings.editor,
      notebookModeByBook: data.settings.notebookModeByBook,
      proofreadingByBook: data.settings.proofreadingByBook,
    });
  });

  test("creates one active and one per-book reading progress record", async () => {
    const data = createSeedRepositoryData();
    const snapshot = await createSyncSnapshot(
      data,
      createSyncDeviceState("device-a"),
      "2026-01-01T00:00:00.000Z",
    );
    const progress = snapshot.changedRecords.filter((record) => record.recordType === "progress");

    expect(progress).toHaveLength(data.books.length + 1);
    expect(progress.find((record) => record.recordId === "active")?.payload).toEqual({
      activeBookId: data.settings.activeBookId,
      kind: "active",
    });
    for (const book of data.books) {
      expect(progress.find((record) => record.recordId === book.id)?.payload).toEqual({
        bookId: book.id,
        chapterId: data.settings.lastChapterByBook[book.id],
        kind: "book",
        position: data.settings.readingPositionByBook[book.id],
      });
    }
  });

  test("does not infer a deletion from missing local data", async () => {
    const data = createSeedRepositoryData();
    const state = createSyncDeviceState("device-a");
    const initial = await createSyncSnapshot(data, state, "2026-01-01T00:00:00.000Z");
    expect(initial.state.records["theme:theme"]).not.toHaveProperty("payload");
    const bookId = data.books[0].id;
    data.chapters[bookId] = data.chapters[bookId].slice(1);

    const next = await createSyncSnapshot(data, initial.state, "2026-01-02T00:00:00.000Z");
    expect(next.changedRecords).toEqual([]);
  });

  test("creates a tombstone only for an explicit repository deletion", async () => {
    const data = createSeedRepositoryData();
    const state = createSyncDeviceState("device-a");
    const initial = await createSyncSnapshot(data, state, "2026-01-01T00:00:00.000Z");
    const bookId = data.books[0].id;
    const removedChapterId = data.chapters[bookId][0].id;
    const queued = await queueSyncDeletions(
      initial.state,
      [{ recordId: `${bookId}:${removedChapterId}`, recordType: "chapter" }],
      "2026-01-02T00:00:00.000Z",
    );
    data.chapters[bookId] = data.chapters[bookId].slice(1);

    const next = await createSyncSnapshot(data, queued, "2026-01-02T00:00:01.000Z");
    expect(next.changedRecords).toEqual([
      expect.objectContaining({
        deleted: true,
        modifiedAt: "2026-01-02T00:00:00.000Z",
        recordId: `${bookId}:${removedChapterId}`,
        recordType: "chapter",
      }),
    ]);
    expect(next.state.pendingDeletes).toHaveProperty(`chapter:${bookId}:${removedChapterId}`);
  });

  test("uses device ID as a deterministic timestamp tie-breaker", () => {
    const base = {
      deleted: false,
      modifiedAt: "2026-01-01T00:00:00.000Z",
      payload: "paper",
      recordId: "theme",
      recordType: "theme" as const,
    };
    expect(
      compareSyncRecords({ ...base, deviceId: "z" }, { ...base, deviceId: "a" }),
    ).toBeGreaterThan(0);
  });

  test("applies synced preferences from a legacy full settings record without replacing device state", async () => {
    const data = createSeedRepositoryData();
    data.settings.activeBookId = "local-book";
    data.settings.lastChapterByBook = { "local-book": "local-chapter" };
    data.settings.readingPositionByBook = { "local-book": 0.42 };
    data.settings.backupReminder = {
      enabled: false,
      frequency: "weekly",
      lastShownAt: "2026-02-01T00:00:00.000Z",
    };
    const snapshot = await createSyncSnapshot(
      data,
      createSyncDeviceState("device-a"),
      "2026-01-01T00:00:00.000Z",
    );
    const result = applySyncRecords(data, snapshot.state, [
      {
        deleted: false,
        deviceId: "device-b",
        contentHash: "a".repeat(64),
        modifiedAt: "2027-01-01T00:00:00.000Z",
        payload: {
          ...data.settings,
          activeBookId: "remote-book",
          lastChapterByBook: { "remote-book": "remote-chapter" },
          readingPositionByBook: { "remote-book": 0.9 },
          backupReminder: {
            enabled: true,
            frequency: "weekly",
            lastShownAt: null,
          },
          editor: { ...data.settings.editor, fontSize: 20 },
          proofreadingByBook: {
            "remote-book": { dialect: "british", words: ["colourway"] },
          },
        },
        recordId: "settings",
        recordType: "settings",
        serverRevision: 1,
      },
    ]);
    expect(result.data.settings.editor.fontSize).toBe(20);
    expect(result.data.settings.proofreadingByBook).toEqual({
      "remote-book": { dialect: "british", words: ["colourway"] },
    });
    expect(result.data.settings.activeBookId).toBe("local-book");
    expect(result.data.settings.lastChapterByBook).toEqual({
      "local-book": "local-chapter",
    });
    expect(result.data.settings.readingPositionByBook).toEqual({ "local-book": 0.42 });
    expect(result.data.settings.backupReminder).toEqual(data.settings.backupReminder);
  });

  test("applies active and per-book progress without replacing unrelated settings", async () => {
    const data = createSeedRepositoryData();
    const [firstBook, secondBook] = data.books;
    const remoteChapter = data.chapters[firstBook.id][0].id;
    const originalEditor = structuredClone(data.settings.editor);
    const originalProofreading = structuredClone(data.settings.proofreadingByBook);
    const originalReminder = structuredClone(data.settings.backupReminder);
    const snapshot = await createSyncSnapshot(
      data,
      createSyncDeviceState("device-a"),
      "2026-01-01T00:00:00.000Z",
    );
    const result = applySyncRecords(data, snapshot.state, [
      {
        contentHash: "b".repeat(64),
        deleted: false,
        deviceId: "device-b",
        modifiedAt: "2027-01-01T00:00:00.000Z",
        payload: { activeBookId: secondBook.id, kind: "active" },
        recordId: "active",
        recordType: "progress",
        serverRevision: 1,
      },
      {
        contentHash: "c".repeat(64),
        deleted: false,
        deviceId: "device-b",
        modifiedAt: "2027-01-01T00:00:00.000Z",
        payload: {
          bookId: firstBook.id,
          chapterId: remoteChapter,
          kind: "book",
          position: 0.88,
        },
        recordId: firstBook.id,
        recordType: "progress",
        serverRevision: 2,
      },
    ]);

    expect(result.data.settings.activeBookId).toBe(secondBook.id);
    expect(result.data.settings.lastChapterByBook[firstBook.id]).toBe(remoteChapter);
    expect(result.data.settings.readingPositionByBook[firstBook.id]).toBe(0.88);
    expect(result.data.settings.editor).toEqual(originalEditor);
    expect(result.data.settings.proofreadingByBook).toEqual(originalProofreading);
    expect(result.data.settings.backupReminder).toEqual(originalReminder);
  });

  test("applies a progress tombstone without deleting proofreading preferences", async () => {
    const data = createSeedRepositoryData();
    const bookId = data.books[0].id;
    const result = applySyncRecords(data, createSyncDeviceState("device-a"), [
      {
        contentHash: "d".repeat(64),
        deleted: true,
        deviceId: "device-b",
        modifiedAt: "2027-01-01T00:00:00.000Z",
        payload: null,
        recordId: bookId,
        recordType: "progress",
        serverRevision: 1,
      },
    ]);

    expect(result.data.settings.lastChapterByBook[bookId]).toBeUndefined();
    expect(result.data.settings.readingPositionByBook[bookId]).toBeUndefined();
    expect(result.data.settings.proofreadingByBook[bookId]).toEqual(
      data.settings.proofreadingByBook[bookId],
    );
    expect(result.data.settings.activeBookId).toBeNull();
  });

  test("cleans up all per-book settings when a remote book is deleted", async () => {
    const data = createSeedRepositoryData();
    const bookId = data.books[0].id;
    data.settings.notebookModeByBook[bookId] = true;
    const result = applySyncRecords(data, createSyncDeviceState("device-a"), [
      {
        contentHash: "e".repeat(64),
        deleted: true,
        deviceId: "device-b",
        modifiedAt: "2027-01-01T00:00:00.000Z",
        payload: null,
        recordId: bookId,
        recordType: "book",
        serverRevision: 1,
      },
    ]);

    expect(result.data.settings.lastChapterByBook[bookId]).toBeUndefined();
    expect(result.data.settings.notebookModeByBook[bookId]).toBeUndefined();
    expect(result.data.settings.readingPositionByBook[bookId]).toBeUndefined();
    expect(result.data.settings.proofreadingByBook[bookId]).toBeUndefined();
    expect(result.data.settings.activeBookId).toBe(result.data.books[0]?.id ?? null);
  });

  test("applies books before their chapters and characters regardless of revision order", async () => {
    const source = createSeedRepositoryData();
    const sourceBook = source.books[0];
    const snapshot = await createSyncSnapshot(
      source,
      createSyncDeviceState("device-a"),
      "2026-01-01T00:00:00.000Z",
    );
    const bookRecord = snapshot.changedRecords.find(
      (record) => record.recordType === "book" && record.recordId === sourceBook.id,
    );
    const dependentRecords = snapshot.changedRecords.filter(
      (record) =>
        (record.recordType === "chapter" || record.recordType === "character") &&
        record.recordId.startsWith(`${sourceBook.id}:`),
    );
    if (!bookRecord || dependentRecords.length === 0) {
      throw new Error("Seed data must include a book with dependent records.");
    }

    const target = structuredClone(source);
    target.books = [];
    target.chapters = {};
    target.characters = {};
    const canonical = [...dependentRecords, bookRecord].map((record, index) => ({
      ...record,
      serverRevision: index + 1,
    }));

    const result = applySyncRecords(target, createSyncDeviceState("device-b"), canonical);

    expect(result.data.books.map((book) => book.id)).toEqual([sourceBook.id]);
    expect(result.data.chapters[sourceBook.id].map((chapter) => chapter.id)).toEqual(
      source.chapters[sourceBook.id].map((chapter) => chapter.id),
    );
    expect(result.data.characters[sourceBook.id].map((character) => character.id)).toEqual(
      source.characters[sourceBook.id].map((character) => character.id),
    );
  });

  test("repairs duplicate chapter numbers from merged workspaces before local persistence", () => {
    const data = createSeedRepositoryData();
    const bookId = data.books[0].id;
    const [first, second, third] = data.chapters[bookId];
    const state = createSyncDeviceState("device-a");
    const result = applySyncRecords(data, state, [
      {
        contentHash: "b".repeat(64),
        deleted: false,
        deviceId: "device-b",
        modifiedAt: "2027-01-01T00:00:00.000Z",
        payload: { ...second, bookId, number: 1 },
        recordId: `${bookId}:${second.id}`,
        recordType: "chapter",
        serverRevision: 1,
      },
    ]);

    expect(result.changed).toBe(true);
    expect(result.data.chapters[bookId].map((chapter) => chapter.number)).toEqual([1, 2, 3]);
    expect(result.data.chapters[bookId].map((chapter) => chapter.id)).toEqual([
      first.id,
      second.id,
      third.id,
    ]);
  });
});
