import { describe, expect, test } from "bun:test";
import {
  createSyncDeviceState,
  syncDeviceLockName,
  withLatestSyncDeviceState,
  writeSyncDeviceState,
} from "./device-state";

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("sync device lock", () => {
  test("waits for the exclusive lock and then reads the latest persisted state", async () => {
    const storage = createStorage();
    writeSyncDeviceState(storage, { ...createSyncDeviceState("device-a"), cursor: 1 });

    let tail = Promise.resolve();
    const requests: Array<{ mode: string; name: string }> = [];
    const lockManager = {
      request<T>(name: string, options: { mode: "exclusive" }, callback: () => Promise<T>) {
        requests.push({ mode: options.mode, name });
        const result = tail.then(callback);
        tail = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      },
    };
    const firstStarted = deferred();
    const releaseFirst = deferred();

    const first = withLatestSyncDeviceState(
      storage,
      async (state) => {
        expect(state.cursor).toBe(1);
        firstStarted.resolve();
        await releaseFirst.promise;
        writeSyncDeviceState(storage, { ...state, cursor: 2 });
      },
      lockManager,
    );
    await firstStarted.promise;

    let secondStarted = false;
    const second = withLatestSyncDeviceState(
      storage,
      async (state) => {
        secondStarted = true;
        return state.cursor;
      },
      lockManager,
    );
    await Promise.resolve();
    expect(secondStarted).toBe(false);

    releaseFirst.resolve();
    await first;
    expect(await second).toBe(2);
    expect(requests).toEqual([
      { mode: "exclusive", name: syncDeviceLockName },
      { mode: "exclusive", name: syncDeviceLockName },
    ]);
  });
});
