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

  test("applies a newer remote record while keeping the local backup reminder", async () => {
    const data = createSeedRepositoryData();
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
          backupReminder: undefined,
          editor: { ...data.settings.editor, fontSize: 20 },
        },
        recordId: "settings",
        recordType: "settings",
        serverRevision: 1,
      },
    ]);
    expect(result.data.settings.editor.fontSize).toBe(20);
    expect(result.data.settings.backupReminder).toEqual(data.settings.backupReminder);
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
