import { describe, expect, mock, test } from "bun:test";
import type { ClientSession, Db } from "mongodb";
import type { SyncedRecord, SyncRecord } from "@/lib/sync/types";

mock.module("server-only", () => ({}));

const { pushSyncRecords } = await import("./sync-records");

const tombstone: SyncRecord = {
  contentHash: "",
  deleted: true,
  deviceId: "device-a",
  modifiedAt: "2026-09-04T12:00:00.000Z",
  payload: null,
  recordId: "book-1",
  recordType: "book",
};

function createDatabase(existing: SyncedRecord | null = null) {
  const publicationDeletes: Array<{
    filter: unknown;
    options: unknown;
  }> = [];
  const syncUpdates: unknown[] = [];

  const database = {
    collection(name: string) {
      if (name === "syncRecords") {
        return {
          findOne: async () => existing,
          updateOne: async (...args: unknown[]) => {
            syncUpdates.push(args);
          },
        };
      }
      if (name === "syncCounters") {
        return {
          findOneAndUpdate: async () => ({ _id: "syncRecords", value: 42 }),
        };
      }
      if (name === "publishedStories") {
        return {
          deleteOne: async (filter: unknown, options: unknown) => {
            publicationDeletes.push({ filter, options });
          },
        };
      }
      throw new Error(`Unexpected collection: ${name}`);
    },
  } as unknown as Db;

  return { database, publicationDeletes, syncUpdates };
}

describe("sync book deletion cleanup", () => {
  test("removes the published story when a book tombstone wins", async () => {
    const { database, publicationDeletes, syncUpdates } = createDatabase();
    const session = {} as ClientSession;

    await pushSyncRecords(database, "user-1", [tombstone], { session });

    expect(syncUpdates).toHaveLength(1);
    expect(publicationDeletes).toEqual([
      {
        filter: { bookId: "book-1", userId: "user-1" },
        options: { session },
      },
    ]);
  });

  test("retries publication cleanup for an existing canonical tombstone", async () => {
    const existing: SyncedRecord = {
      ...tombstone,
      contentHash: "a".repeat(64),
      serverRevision: 41,
    };
    const { database, publicationDeletes, syncUpdates } = createDatabase(existing);

    await pushSyncRecords(database, "user-1", [tombstone]);

    expect(syncUpdates).toHaveLength(0);
    expect(publicationDeletes).toHaveLength(1);
  });

  test("keeps the publication when a newer live book record wins", async () => {
    const existing: SyncedRecord = {
      ...tombstone,
      contentHash: "b".repeat(64),
      deleted: false,
      deviceId: "device-b",
      modifiedAt: "2026-09-05T12:00:00.000Z",
      payload: { id: "book-1" },
      serverRevision: 43,
    };
    const { database, publicationDeletes, syncUpdates } = createDatabase(existing);

    await pushSyncRecords(database, "user-1", [tombstone]);

    expect(syncUpdates).toHaveLength(0);
    expect(publicationDeletes).toHaveLength(0);
  });
});
