import type { AwthorRepository } from "@/lib/repository";
import { applySyncRecords, createSyncSnapshot } from "./records";
import { type SyncDeviceState, syncPullResponseSchema, syncPushResponseSchema } from "./types";

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

/** Synchronizes a complete local manifest in bounded batches, then applies remote changes. */
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
  const snapshot = createSyncSnapshot(await repository.getData(), state, now);
  let cursor = snapshot.state.cursor;
  const canonical = [];

  for (let index = 0; index < snapshot.records.length; index += 50) {
    const body = await requestJson("/api/sync/push", {
      body: JSON.stringify({ records: snapshot.records.slice(index, index + 50) }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const parsed = syncPushResponseSchema.parse(body);
    canonical.push(...parsed.records);
    cursor = Math.max(cursor, parsed.cursor);
  }

  const pulled = syncPullResponseSchema.parse(
    await requestJson(`/api/sync/pull?cursor=${String(snapshot.state.cursor)}`),
  );
  canonical.push(...pulled.records);
  cursor = Math.max(cursor, pulled.cursor);

  const latest = await repository.getData();
  const current = createSyncSnapshot(latest, snapshot.state, new Date().toISOString());
  const applied = applySyncRecords(latest, current.state, canonical);
  onApplyingRemoteChange?.(true);
  try {
    await repository.replaceData(applied.data);
  } finally {
    onApplyingRemoteChange?.(false);
  }

  return {
    ...applied.state,
    cursor,
    lastAttemptAt: now,
    lastError: null,
    lastSuccessfulSyncAt: new Date().toISOString(),
  };
}
