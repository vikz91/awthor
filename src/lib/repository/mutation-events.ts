import type { RepositoryMutationDetail, RepositoryMutationOptions } from "./contract";

export const repositoryMutatedEventName = "awthor:repository-mutated";

function deferredMutation(): RepositoryMutationDetail {
  return { syncPolicy: "deferred" };
}

function isSyncPolicy(value: unknown): value is RepositoryMutationDetail["syncPolicy"] {
  return (
    value === "local-only" || value === "progress" || value === "deferred" || value === "immediate"
  );
}

/** Reads both typed mutation events and the plain legacy event safely. */
export function readRepositoryMutation(event: Event): RepositoryMutationDetail {
  if (!("detail" in event)) return deferredMutation();

  const detail: unknown = (event as CustomEvent<unknown>).detail;
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return deferredMutation();

  const candidate = detail as Record<string, unknown>;
  if (!isSyncPolicy(candidate.syncPolicy)) return deferredMutation();
  if (candidate.reason !== undefined && typeof candidate.reason !== "string") {
    return deferredMutation();
  }

  return candidate.reason === undefined
    ? { syncPolicy: candidate.syncPolicy }
    : { reason: candidate.reason, syncPolicy: candidate.syncPolicy };
}

export function announceRepositoryMutation(options: RepositoryMutationOptions = {}): void {
  if (typeof window === "undefined") return;

  const detail: RepositoryMutationDetail = {
    syncPolicy: options.syncPolicy ?? "deferred",
    ...(options.reason === undefined ? {} : { reason: options.reason }),
  };
  window.dispatchEvent(
    new CustomEvent<RepositoryMutationDetail>(repositoryMutatedEventName, { detail }),
  );
}
