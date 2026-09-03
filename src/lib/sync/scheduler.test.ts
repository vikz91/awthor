import { describe, expect, test } from "bun:test";
import {
  deferredSyncDelayMs,
  getAutomaticSyncDelayMs,
  getSyncBackoffDelayMs,
  immediateSyncDelayMs,
  isSuccessfulSyncStale,
  mergeAutomaticSyncPolicies,
  progressSyncDelayMs,
  resolveAutomaticSyncSchedule,
  syncStaleAfterMs,
} from "./scheduler";

describe("sync scheduling", () => {
  test("uses a short delay for immediate work and a longer writing debounce", () => {
    expect(getAutomaticSyncDelayMs("immediate")).toBe(immediateSyncDelayMs);
    expect(getAutomaticSyncDelayMs("deferred")).toBe(deferredSyncDelayMs);
    expect(getAutomaticSyncDelayMs("progress")).toBe(progressSyncDelayMs);
    expect(deferredSyncDelayMs).toBeGreaterThan(immediateSyncDelayMs);
    expect(progressSyncDelayMs).toBeGreaterThan(deferredSyncDelayMs);
  });

  test("only considers a previous successful sync stale after two minutes", () => {
    const now = Date.parse("2026-09-04T12:00:00.000Z");
    expect(isSuccessfulSyncStale(null, now)).toBe(false);
    expect(isSuccessfulSyncStale("2026-09-04T11:58:00.001Z", now)).toBe(false);
    expect(isSuccessfulSyncStale("2026-09-04T11:58:00.000Z", now)).toBe(true);
    expect(isSuccessfulSyncStale("invalid", now)).toBe(true);
    expect(syncStaleAfterMs).toBe(120_000);
  });

  test("backs off exponentially and caps retries at five minutes", () => {
    expect(getSyncBackoffDelayMs(0)).toBe(0);
    expect(getSyncBackoffDelayMs(1)).toBe(5_000);
    expect(getSyncBackoffDelayMs(2)).toBe(10_000);
    expect(getSyncBackoffDelayMs(3)).toBe(20_000);
    expect(getSyncBackoffDelayMs(20)).toBe(300_000);
  });

  test("merges policies by priority", () => {
    expect(mergeAutomaticSyncPolicies(null, "progress")).toBe("progress");
    expect(mergeAutomaticSyncPolicies("progress", "deferred")).toBe("deferred");
    expect(mergeAutomaticSyncPolicies("deferred", "progress")).toBe("deferred");
    expect(mergeAutomaticSyncPolicies(null, "deferred")).toBe("deferred");
    expect(mergeAutomaticSyncPolicies("deferred", "immediate")).toBe("immediate");
    expect(mergeAutomaticSyncPolicies("immediate", "deferred")).toBe("immediate");
  });

  test("keeps the first progress deadline when more progress arrives", () => {
    const first = resolveAutomaticSyncSchedule(null, "progress", 1_000);
    expect(first).toEqual({
      deadlineAt: 61_000,
      policy: "progress",
      progressDeadlineAt: 61_000,
    });
    expect(resolveAutomaticSyncSchedule(first, "progress", 20_000)).toEqual(first);
  });

  test("does not let lower-priority work postpone a sooner timer", () => {
    const immediate = { deadlineAt: 1_800, policy: "immediate" } as const;
    expect(resolveAutomaticSyncSchedule(immediate, "deferred", 1_100)).toEqual(immediate);
    expect(resolveAutomaticSyncSchedule(immediate, "progress", 1_100)).toEqual(immediate);

    const deferred = { deadlineAt: 11_000, policy: "deferred" } as const;
    expect(resolveAutomaticSyncSchedule(deferred, "progress", 2_000)).toEqual(deferred);
  });

  test("pulls a progress deadline forward for higher-priority work", () => {
    const progress = {
      deadlineAt: 61_000,
      policy: "progress",
      progressDeadlineAt: 61_000,
    } as const;
    expect(resolveAutomaticSyncSchedule(progress, "deferred", 5_000)).toEqual({
      deadlineAt: 15_000,
      policy: "deferred",
      progressDeadlineAt: 61_000,
    });
    expect(resolveAutomaticSyncSchedule(progress, "immediate", 5_000)).toEqual({
      deadlineAt: 5_800,
      policy: "immediate",
      progressDeadlineAt: 61_000,
    });
  });

  test("lets deferred work piggyback on an earlier progress deadline", () => {
    const progress = {
      deadlineAt: 9_000,
      policy: "progress",
      progressDeadlineAt: 9_000,
    } as const;
    expect(resolveAutomaticSyncSchedule(progress, "deferred", 5_000)).toEqual({
      deadlineAt: 9_000,
      policy: "deferred",
      progressDeadlineAt: 9_000,
    });
  });

  test("does not reset deferred work past a carried progress deadline", () => {
    const progress = resolveAutomaticSyncSchedule(null, "progress", -51_000);
    const firstDeferred = resolveAutomaticSyncSchedule(progress, "deferred", 5_000);
    expect(firstDeferred).toEqual({
      deadlineAt: 9_000,
      policy: "deferred",
      progressDeadlineAt: 9_000,
    });
    expect(resolveAutomaticSyncSchedule(firstDeferred, "deferred", 6_000)).toEqual({
      deadlineAt: 9_000,
      policy: "deferred",
      progressDeadlineAt: 9_000,
    });
  });

  test("continues to debounce deferred work and respects backoff", () => {
    const deferred = { deadlineAt: 11_000, policy: "deferred" } as const;
    expect(resolveAutomaticSyncSchedule(deferred, "deferred", 5_000)).toEqual({
      deadlineAt: 15_000,
      policy: "deferred",
    });
    expect(resolveAutomaticSyncSchedule(null, "immediate", 5_000, 30_000)).toEqual({
      deadlineAt: 30_000,
      policy: "immediate",
    });
  });
});
