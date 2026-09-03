import { describe, expect, test } from "bun:test";
import {
  initialNavbarSyncFeedback,
  navbarSyncSuccessDurationMs,
  reduceNavbarSyncFeedback,
  shouldShowNavbarSyncOnMobile,
} from "./sync-control";

describe("navbar sync feedback", () => {
  test("stays visible before the first sync and when local changes are pending", () => {
    expect(
      shouldShowNavbarSyncOnMobile({
        feedback: initialNavbarSyncFeedback,
        lastSuccessfulSyncAt: null,
        status: "idle",
      }),
    ).toBe(true);

    const pending = reduceNavbarSyncFeedback(initialNavbarSyncFeedback, {
      type: "local-change",
    });
    expect(
      shouldShowNavbarSyncOnMobile({
        feedback: pending,
        lastSuccessfulSyncAt: "2026-09-03T10:00:00.000Z",
        status: "idle",
      }),
    ).toBe(true);
  });

  test("shows a success state after syncing, then hides it after one second", () => {
    const pending = reduceNavbarSyncFeedback(initialNavbarSyncFeedback, {
      type: "local-change",
    });
    const syncing = reduceNavbarSyncFeedback(pending, {
      type: "status-change",
      status: "syncing",
    });
    const synced = reduceNavbarSyncFeedback(syncing, {
      type: "status-change",
      status: "idle",
    });

    expect(synced).toEqual({
      hasPendingLocalChanges: false,
      showSuccess: true,
      wasSyncing: false,
    });
    expect(navbarSyncSuccessDurationMs).toBe(1_000);
    expect(
      shouldShowNavbarSyncOnMobile({
        feedback: synced,
        lastSuccessfulSyncAt: "2026-09-03T10:00:00.000Z",
        status: "idle",
      }),
    ).toBe(true);

    const expired = reduceNavbarSyncFeedback(synced, { type: "success-expired" });
    expect(
      shouldShowNavbarSyncOnMobile({
        feedback: expired,
        lastSuccessfulSyncAt: "2026-09-03T10:00:00.000Z",
        status: "idle",
      }),
    ).toBe(false);
  });

  test("keeps syncing, offline, and error states visible", () => {
    for (const status of ["syncing", "offline", "error"] as const) {
      expect(
        shouldShowNavbarSyncOnMobile({
          feedback: initialNavbarSyncFeedback,
          lastSuccessfulSyncAt: "2026-09-03T10:00:00.000Z",
          status,
        }),
      ).toBe(true);
    }

    expect(
      shouldShowNavbarSyncOnMobile({
        feedback: initialNavbarSyncFeedback,
        hasPersistentFailure: true,
        lastSuccessfulSyncAt: "2026-09-03T10:00:00.000Z",
        status: "idle",
      }),
    ).toBe(true);
  });
});
