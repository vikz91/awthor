import type { AwthorRepository } from "@/lib/repository";
import { applySyncRecords, createSyncSnapshot } from "./records";
import {
  type SyncDeviceState,
  type SyncRecord,
  syncPullResponseSchema,
  syncPushResponseSchema,
} from "./types";

const maxBatchBytes = 512 * 1024;

function byteLength(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

/** Batches are bounded by both record count and request size for large chapters. */
export function createSyncBatches(records: readonly SyncRecord[]) {
  const batches: SyncRecord[][] = [];
  let batch: SyncRecord[] = [];
  let batchBytes = byteLength({ records: [] });

  for (const record of records) {
    const recordBytes = byteLength(record);
    if (batch.length > 0 && (batch.length === 50 || batchBytes + recordBytes > maxBatchBytes)) {
      batches.push(batch);
      batch = [];
      batchBytes = byteLength({ records: [] });
    }
    batch.push(record);
    batchBytes += recordBytes;
  }
  if (batch.length > 0) batches.push(batch);
  return batches;
}

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : "Sync could not be completed.";
    throw new Error(message);
  }
  return body;
}

/** Synchronizes only local changes, then applies the cursor-based remote delta. */
export async function syncRepository({
  onApplyingRemoteChange,
  repository,
  state,
}: {
  onApplyingRemoteChange?: (applying: boolean) => void;
  repository: AwthorRepository;
  state: SyncDeviceState;
}) {
  const now = new Date().toISOString();
  const snapshot = await createSyncSnapshot(await repository.getData(), state, now);
  let cursor = snapshot.state.cursor;
  const canonical = [];

  for (const records of createSyncBatches(snapshot.changedRecords)) {
    const body = await requestJson("/api/sync/push", {
      body: JSON.stringify({ records }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const parsed = syncPushResponseSchema.parse(body);
    canonical.push(...parsed.records);
    cursor = Math.max(cursor, parsed.cursor);
  }

  let pullCursor = snapshot.state.cursor;
  let hasMore = true;
  while (hasMore) {
    const pulled = syncPullResponseSchema.parse(
      await requestJson(`/api/sync/pull?cursor=${String(pullCursor)}`),
    );
    canonical.push(...pulled.records);
    cursor = Math.max(cursor, pulled.cursor);
    pullCursor = pulled.cursor;
    hasMore = pulled.hasMore;
  }

  const latest = await repository.getData();
  const current = await createSyncSnapshot(latest, snapshot.state, new Date().toISOString());
  const applied = applySyncRecords(latest, current.state, canonical);
  if (applied.changed) {
    onApplyingRemoteChange?.(true);
    try {
      await repository.replaceData(applied.data);
    } finally {
      onApplyingRemoteChange?.(false);
    }
  }

  return {
    ...applied.state,
    cursor,
    lastAttemptAt: now,
    lastError: null,
    lastSuccessfulSyncAt: new Date().toISOString(),
  };
}
