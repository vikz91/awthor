import { describe, expect, test } from "bun:test";
import { createSyncBatches } from "./client";
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
});
