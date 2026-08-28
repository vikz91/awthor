const millisecondsPerDay = 24 * 60 * 60 * 1000;

export const firstBackupReminderDelayMs = 5 * 60 * 1000;
export const recurringBackupReminderAgeMs = 6 * millisecondsPerDay;

/**
 * Returns the delay for this session's reminder check.
 * A recorded reminder becomes due only after it is more than six days old.
 */
export function getBackupReminderDelay(
  lastShownAt: string | null,
  now = Date.now(),
): number | null {
  if (!lastShownAt) {
    return firstBackupReminderDelayMs;
  }

  const lastShownTime = Date.parse(lastShownAt);
  if (!Number.isFinite(lastShownTime)) {
    return firstBackupReminderDelayMs;
  }

  return now - lastShownTime > recurringBackupReminderAgeMs ? 0 : null;
}
