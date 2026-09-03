export const deferredSyncDelayMs = 10_000;
export const immediateSyncDelayMs = 800;
export const progressSyncDelayMs = 60_000;
export const syncStaleAfterMs = 2 * 60_000;

const syncBackoffBaseMs = 5_000;
const syncBackoffMaximumMs = 5 * 60_000;

export type AutomaticSyncPolicy = "progress" | "deferred" | "immediate";

export type AutomaticSyncSchedule = {
  deadlineAt: number;
  policy: AutomaticSyncPolicy;
  progressDeadlineAt?: number;
};

const policyPriority: Record<AutomaticSyncPolicy, number> = {
  progress: 0,
  deferred: 1,
  immediate: 2,
};

export function isSuccessfulSyncStale(lastSuccessfulSyncAt: string | null, now = Date.now()) {
  if (!lastSuccessfulSyncAt) return false;

  const lastSuccessfulTime = Date.parse(lastSuccessfulSyncAt);
  return !Number.isFinite(lastSuccessfulTime) || now - lastSuccessfulTime >= syncStaleAfterMs;
}

export function getAutomaticSyncDelayMs(policy: AutomaticSyncPolicy) {
  if (policy === "immediate") return immediateSyncDelayMs;
  return policy === "deferred" ? deferredSyncDelayMs : progressSyncDelayMs;
}

/**
 * Chooses the next automatic timer without letting low-priority work push back
 * a sooner deadline. Progress uses a fixed window from its first event, while
 * deferred and immediate work retain their debounce behavior.
 */
export function resolveAutomaticSyncSchedule(
  current: AutomaticSyncSchedule | null,
  nextPolicy: AutomaticSyncPolicy,
  now: number,
  notBefore = now,
): AutomaticSyncSchedule {
  const requestedDeadline = Math.max(now + getAutomaticSyncDelayMs(nextPolicy), notBefore);
  if (!current) {
    return {
      deadlineAt: requestedDeadline,
      policy: nextPolicy,
      ...(nextPolicy === "progress" ? { progressDeadlineAt: requestedDeadline } : {}),
    };
  }

  const priorityDifference = policyPriority[nextPolicy] - policyPriority[current.policy];
  if (priorityDifference < 0 || nextPolicy === "progress") return current;
  const deadlineAt =
    current.progressDeadlineAt === undefined
      ? requestedDeadline
      : Math.max(notBefore, Math.min(requestedDeadline, current.progressDeadlineAt));
  if (priorityDifference === 0) {
    return { ...current, deadlineAt, policy: nextPolicy };
  }

  return {
    ...current,
    deadlineAt: Math.min(current.deadlineAt, deadlineAt),
    policy: nextPolicy,
  };
}

export function getSyncBackoffDelayMs(failureCount: number) {
  if (failureCount <= 0) return 0;

  return Math.min(syncBackoffBaseMs * 2 ** Math.min(failureCount - 1, 16), syncBackoffMaximumMs);
}

export function mergeAutomaticSyncPolicies(
  current: AutomaticSyncPolicy | null,
  next: AutomaticSyncPolicy,
): AutomaticSyncPolicy {
  if (!current || policyPriority[next] > policyPriority[current]) return next;
  return current;
}
