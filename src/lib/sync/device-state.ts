import { type SyncDeviceState, syncDeviceStateSchema } from "./types";

export const syncDeviceStateKey = "awthor:sync:v1:device-state";

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
