import { type SyncDeviceState, syncDeviceStateSchema } from "./types";

export const syncDeviceStateKey = "awthor:sync:v1:device-state";
export const syncDeviceLockName = "awthor:sync:v1";

type SyncLockManager = {
  request<T>(name: string, options: { mode: "exclusive" }, callback: () => Promise<T>): Promise<T>;
};

function getBrowserLockManager(): SyncLockManager | undefined {
  if (typeof navigator === "undefined" || !("locks" in navigator)) return undefined;
  return {
    request: async (name, options, callback) =>
      await navigator.locks.request(name, options, callback),
  };
}

export function createSyncDeviceState(deviceId = crypto.randomUUID()): SyncDeviceState {
  return syncDeviceStateSchema.parse({ deviceId });
}

export function readSyncDeviceState(storage: Storage): SyncDeviceState {
  const raw = storage.getItem(syncDeviceStateKey);
  if (!raw) return createSyncDeviceState();
  try {
    const parsed = syncDeviceStateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : createSyncDeviceState();
  } catch {
    return createSyncDeviceState();
  }
}

export function writeSyncDeviceState(storage: Storage, state: SyncDeviceState) {
  storage.setItem(syncDeviceStateKey, JSON.stringify(syncDeviceStateSchema.parse(state)));
}

/**
 * Serializes sync-device state changes across same-origin tabs. The persisted
 * state is intentionally read inside the lock so queued tabs cannot reuse a
 * cursor or record map captured before an earlier sync completed.
 */
export async function withLatestSyncDeviceState<T>(
  storage: Storage,
  operation: (state: SyncDeviceState) => Promise<T>,
  lockManager = getBrowserLockManager(),
) {
  const run = () => operation(readSyncDeviceState(storage));
  if (!lockManager) return run();
  return lockManager.request(syncDeviceLockName, { mode: "exclusive" }, run);
}
