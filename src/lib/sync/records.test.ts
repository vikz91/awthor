import { describe, expect, test } from "bun:test";
import { createSeedRepositoryData } from "@/lib/repository";
import { createSyncDeviceState } from "./device-state";
import { applySyncRecords, compareSyncRecords, createSyncSnapshot } from "./records";

describe("sync records", () => {
  test("tracks a deleted chapter as a tombstone without resending unchanged records", async () => {
    const data = createSeedRepositoryData();
    const state = createSyncDeviceState("device-a");
    const initial = await createSyncSnapshot(data, state, "2026-01-01T00:00:00.000Z");
    expect(initial.state.records["theme:theme"]).not.toHaveProperty("payload");
    const bookId = data.books[0].id;
    const removedChapterId = data.chapters[bookId][0].id;
    data.chapters[bookId] = data.chapters[bookId].slice(1);

    const next = await createSyncSnapshot(data, initial.state, "2026-01-02T00:00:00.000Z");
    expect(next.changedRecords).toEqual([
      expect.objectContaining({
        deleted: true,
        recordId: `${bookId}:${removedChapterId}`,
        recordType: "chapter",
      }),
    ]);
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
});
