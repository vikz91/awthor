import { compareSyncRecords } from "@/lib/sync/records";
import type { SyncedRecord, SyncRecord } from "@/lib/sync/types";

export type RemoteWorkspaceErrorCode =
  | "BOOK_NOT_FOUND"
  | "CHAPTER_NOT_FOUND"
  | "CHARACTER_NOT_FOUND"
  | "WRITE_CONFLICT"
  | "WORKSPACE_NOT_SYNCED";

export class RemoteWorkspaceError extends Error {
  constructor(
    public readonly code: RemoteWorkspaceErrorCode,
    message: string,
    public readonly canonicalRecords: readonly SyncedRecord[] = [],
  ) {
    super(message);
    this.name = "RemoteWorkspaceError";
  }
}

/** Reject a mutation when sync's LWW rule retained a newer canonical record. */
export function assertRemoteWritesAccepted(
  submitted: readonly SyncRecord[],
  canonical: readonly SyncedRecord[],
) {
  const rejected = canonical.filter(
    (winner, index) => compareSyncRecords(submitted[index], winner) !== 0,
  );
  if (rejected.length > 0) {
    throw new RemoteWorkspaceError(
      "WRITE_CONFLICT",
      "A newer version already exists in your synced workspace. Read it and retry your change.",
      rejected,
    );
  }
}
