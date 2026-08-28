import { describe, expect, test } from "bun:test";
import {
  firstBackupReminderDelayMs,
  getBackupReminderDelay,
  recurringBackupReminderAgeMs,
} from "./backup-reminder";
import { appSettingsSchema } from "./repository/models";

describe("backup reminder schedule", () => {
  const now = Date.parse("2026-08-28T12:00:00.000Z");

  test("waits five minutes when no reminder date exists", () => {
    expect(getBackupReminderDelay(null, now)).toBe(firstBackupReminderDelayMs);
    expect(getBackupReminderDelay("not-a-date", now)).toBe(firstBackupReminderDelayMs);
  });

  test("does not show until the recorded reminder is more than six days old", () => {
    expect(
      getBackupReminderDelay(new Date(now - recurringBackupReminderAgeMs).toISOString(), now),
    ).toBeNull();
    expect(getBackupReminderDelay(new Date(now + 1_000).toISOString(), now)).toBeNull();
  });

  test("shows immediately after the six-day threshold", () => {
    expect(
      getBackupReminderDelay(new Date(now - recurringBackupReminderAgeMs - 1).toISOString(), now),
    ).toBe(0);
  });

  test("migrates the legacy dismissal date into the weekly shown date", () => {
    const legacyDate = "2026-08-20T12:00:00.000Z";
    const settings = appSettingsSchema.parse({
      backupReminder: {
        enabled: true,
        frequency: "monthly",
        lastDismissedAt: legacyDate,
      },
    });

    expect(settings.backupReminder).toEqual({
      enabled: true,
      frequency: "weekly",
      lastShownAt: legacyDate,
    });
  });
});
