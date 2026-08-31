import type { AwthorRepository } from "@/lib/repository";
import { applySyncRecords, createSyncSnapshot } from "./records";
import {
  type SyncDeviceState,
  type SyncedRecord,
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

/**
 * Pulls cloud changes before uploading local intent. A missing local record is
 * never a deletion by itself; only repository-reported deletion intents may
 * produce tombstones.
 */
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
  const localData = await repository.getData();
  const localSnapshot = await createSyncSnapshot(localData, state, now);
  const pulled = await pullSyncRecords(state.cursor);
  const afterPull = applySyncRecords(localData, localSnapshot.state, pulled.records);

  if (afterPull.changed) {
    onApplyingRemoteChange?.(true);
    try {
      await repository.replaceData(afterPull.data);
    } finally {
      onApplyingRemoteChange?.(false);
    }
  }

  const postPullSnapshot = await createSyncSnapshot(
    afterPull.data,
    afterPull.state,
    new Date().toISOString(),
  );
  const outgoing = reconcileOutgoingRecords(
    localSnapshot.changedRecords,
    postPullSnapshot.changedRecords,
    postPullSnapshot.state,
  );
  const canonical = [];
  const acknowledgedDeletes = new Set<string>();
  let cursor = pulled.cursor;

  for (const records of createSyncBatches(outgoing)) {
    const body = await requestJson("/api/sync/push", {
      body: JSON.stringify({ baseCursor: state.cursor, records }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const parsed = syncPushResponseSchema.parse(body);
    canonical.push(...parsed.records);
    cursor = Math.max(cursor, parsed.cursor);
    for (const record of records) {
      if (record.deleted) acknowledgedDeletes.add(`${record.recordType}:${record.recordId}`);
    }
  }

  const applied = applySyncRecords(afterPull.data, postPullSnapshot.state, canonical);
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
    pendingDeletes: Object.fromEntries(
      Object.entries(applied.state.pendingDeletes).filter(([key]) => !acknowledgedDeletes.has(key)),
    ),
  };
}

async function pullSyncRecords(cursor: number) {
  const records: SyncedRecord[] = [];
  let nextCursor = cursor;
  let hasMore = true;
  while (hasMore) {
    const pulled = syncPullResponseSchema.parse(
      await requestJson(`/api/sync/pull?cursor=${String(nextCursor)}`),
    );
    records.push(...pulled.records);
    nextCursor = pulled.cursor;
    hasMore = pulled.hasMore;
  }
  return { cursor: nextCursor, records };
}

function reconcileOutgoingRecords(
  prePullRecords: readonly SyncRecord[],
  postPullRecords: readonly SyncRecord[],
  state: SyncDeviceState,
) {
  const outgoing = new Map<string, SyncRecord>();
  for (const record of prePullRecords) {
    const current = state.records[`${record.recordType}:${record.recordId}`];
    if (current?.contentHash === record.contentHash && current.deviceId === record.deviceId) {
      outgoing.set(`${record.recordType}:${record.recordId}`, record);
    }
  }
  for (const record of postPullRecords) {
    outgoing.set(`${record.recordType}:${record.recordId}`, record);
  }
  return [...outgoing.values()];
}
