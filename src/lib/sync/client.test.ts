import { describe, expect, test } from "bun:test";
import {
  type AwthorRepository,
  createSeedRepositoryData,
  type RepositoryData,
} from "@/lib/repository";
import { createSyncBatches, syncRepository } from "./client";
import { createSyncDeviceState } from "./device-state";
import { createSyncSnapshot } from "./records";
import type { SyncRecord } from "./types";

function record(index: number, payload = "chapter"): SyncRecord {
  return {
    contentHash: "a".repeat(64),
    deleted: false,
    deviceId: "device-a",
    modifiedAt: "2026-01-01T00:00:00.000Z",
    payload,
    recordId: `record-${index}`,
    recordType: "chapter",
  };
}

describe("sync request batches", () => {
  test("caps ordinary batches at fifty records", () => {
    const batches = createSyncBatches(Array.from({ length: 51 }, (_, index) => record(index)));

    expect(batches.map((batch) => batch.length)).toEqual([50, 1]);
  });

  test("isolates a chapter that exceeds the byte budget", () => {
    const batches = createSyncBatches([record(1, "x".repeat(600_000)), record(2)]);

    expect(batches.map((batch) => batch.length)).toEqual([1, 1]);
  });

  test("restores cloud data from an empty device without uploading tombstones", async () => {
    const cloudData = createSeedRepositoryData();
    const state = createSyncDeviceState("device-a");
    const baseline = await createSyncSnapshot(cloudData, state, "2026-01-01T00:00:00.000Z");
    const book = baseline.changedRecords.find((record) => record.recordType === "book");
    if (!book) throw new Error("Seed data must include a book.");

    const localData: RepositoryData = {
      ...cloudData,
      books: [],
      chapters: {},
      characters: {},
    };
    const repository = createRepository(localData);
    const previousFetch = globalThis.fetch;
    let pushes = 0;
    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (url.startsWith("/api/sync/pull")) {
        return Response.json({
          cursor: 11,
          hasMore: false,
          records: [{ ...book, serverRevision: 11 }],
        });
      }
      pushes += 1;
      return Response.json({ cursor: 11, records: [] });
    }) as typeof fetch;

    try {
      await syncRepository({
        repository,
        state: { ...baseline.state, cursor: 10 },
      });
    } finally {
      globalThis.fetch = previousFetch;
    }

    expect(pushes).toBe(0);
    expect((await repository.getData()).books.map((item) => item.id)).toEqual([book.recordId]);
  });
});

function createRepository(initial: RepositoryData) {
  let data = structuredClone(initial);
  return {
    getData: async () => structuredClone(data),
    replaceData: async (next: RepositoryData) => {
      data = structuredClone(next);
    },
  } as AwthorRepository;
}
