"use client";

import { useUser } from "@clerk/nextjs";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSyncAccountConfigured } from "@/components/auth-provider";
import {
  getAwthorRepository,
  readRepositoryMutation,
  repositoryDeletedEventName,
  repositoryMutatedEventName,
} from "@/lib/repository";
import { syncRepository } from "@/lib/sync/client";
import { readSyncDeviceState, writeSyncDeviceState } from "@/lib/sync/device-state";
import { queueSyncDeletions, type SyncDeletion } from "@/lib/sync/records";
import {
  type AutomaticSyncPolicy,
  getSyncBackoffDelayMs,
  isSuccessfulSyncStale,
  mergeAutomaticSyncPolicies,
  resolveAutomaticSyncSchedule,
} from "@/lib/sync/scheduler";
import type { SyncDeviceState, SyncStatus } from "@/lib/sync/types";

const repository = getAwthorRepository();

type SyncContextValue = {
  access: "authorized" | "checking" | "unauthorized";
  configured: boolean;
  lastSuccessfulSyncAt: string | null;
  signedIn: boolean;
  status: SyncStatus;
  syncNow: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const configured = useSyncAccountConfigured();
  return configured ? (
    <ConfiguredSyncProvider>{children}</ConfiguredSyncProvider>
  ) : (
    <LocalSyncProvider>{children}</LocalSyncProvider>
  );
}

function LocalSyncProvider({ children }: { children: ReactNode }) {
  const value = useMemo<SyncContextValue>(
    () => ({
      configured: false,
      access: "authorized",
      lastSuccessfulSyncAt: null,
      signedIn: false,
      status: "idle",
      syncNow: async () => undefined,
    }),
    [],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

function ConfiguredSyncProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const stateRef = useRef<SyncDeviceState | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [access, setAccess] = useState<SyncContextValue["access"]>("checking");
  const [syncStateLoaded, setSyncStateLoaded] = useState(false);
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] = useState<string | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const applyingRemoteChange = useRef(false);
  const accessRef = useRef<SyncContextValue["access"]>("checking");
  const authorizedUserId = useRef<string | null>(null);
  const accessCheckInFlight = useRef<{ promise: Promise<boolean>; userId: string } | null>(null);
  const activeUserId = isSignedIn ? (user?.id ?? null) : null;
  const activeUserIdRef = useRef(activeUserId);
  activeUserIdRef.current = activeUserId;
  const automaticTimer = useRef<number | null>(null);
  const automaticTimerPolicy = useRef<AutomaticSyncPolicy | null>(null);
  const automaticTimerDeadline = useRef<number | null>(null);
  const automaticProgressDeadline = useRef<number | null>(null);
  const failureCount = useRef(0);
  const backoffUntil = useRef(0);
  const localMutationRevision = useRef(0);
  const hasLocalChanges = useRef(false);
  const trailingPolicy = useRef<AutomaticSyncPolicy | null>(null);
  const initialAutoSyncUserId = useRef<string | null>(null);
  const runSyncRef = useRef<((manual: boolean) => Promise<void>) | null>(null);
  const scheduleAutomaticSyncRef = useRef<
    ((policy: AutomaticSyncPolicy, requireTrailing?: boolean) => void) | null
  >(null);

  useEffect(() => {
    const state = readSyncDeviceState(window.localStorage);
    stateRef.current = state;
    setLastSuccessfulSyncAt(state.lastSuccessfulSyncAt);
    setSyncStateLoaded(true);
  }, []);

  const setAccessState = useCallback((next: SyncContextValue["access"]) => {
    accessRef.current = next;
    setAccess(next);
  }, []);

  const checkAccess = useCallback(async () => {
    const userId = activeUserId;
    if (!userId) {
      authorizedUserId.current = null;
      setAccessState("checking");
      return false;
    }
    if (authorizedUserId.current === userId) {
      setAccessState("authorized");
      return true;
    }
    if (accessCheckInFlight.current?.userId === userId) {
      return accessCheckInFlight.current.promise;
    }

    const promise = (async () => {
      const response = await fetch("/api/sync/access", { credentials: "same-origin" });
      if (activeUserIdRef.current !== userId) return false;
      if (response.ok) {
        authorizedUserId.current = userId;
        setAccessState("authorized");
        return true;
      }
      if (response.status === 403) {
        setAccessState("unauthorized");
        return false;
      }
      throw new Error("Sync account access is temporarily unavailable.");
    })();
    accessCheckInFlight.current = { promise, userId };
    try {
      return await promise;
    } finally {
      if (accessCheckInFlight.current?.promise === promise) {
        accessCheckInFlight.current = null;
      }
    }
  }, [activeUserId, setAccessState]);

  useEffect(() => {
    if (!isLoaded) return;
    void checkAccess().catch(() => setStatus("error"));
  }, [checkAccess, isLoaded]);

  const clearScheduledSync = useCallback(() => {
    if (automaticTimer.current !== null) window.clearTimeout(automaticTimer.current);
    automaticTimer.current = null;
    automaticTimerPolicy.current = null;
    automaticTimerDeadline.current = null;
    automaticProgressDeadline.current = null;
  }, []);

  const scheduleAutomaticSync = useCallback(
    (policy: AutomaticSyncPolicy, requireTrailing = false) => {
      if (inFlight.current) {
        if (requireTrailing) {
          trailingPolicy.current = mergeAutomaticSyncPolicies(trailingPolicy.current, policy);
        }
        return;
      }
      if (accessRef.current === "unauthorized") return;

      const now = Date.now();
      const currentSchedule =
        automaticTimer.current !== null &&
        automaticTimerPolicy.current !== null &&
        automaticTimerDeadline.current !== null
          ? {
              deadlineAt: automaticTimerDeadline.current,
              policy: automaticTimerPolicy.current,
              ...(automaticProgressDeadline.current === null
                ? {}
                : { progressDeadlineAt: automaticProgressDeadline.current }),
            }
          : null;
      const nextSchedule = resolveAutomaticSyncSchedule(
        currentSchedule,
        policy,
        now,
        backoffUntil.current,
      );
      if (
        currentSchedule &&
        currentSchedule.deadlineAt === nextSchedule.deadlineAt &&
        currentSchedule.policy === nextSchedule.policy
      ) {
        return;
      }

      clearScheduledSync();
      automaticTimerPolicy.current = nextSchedule.policy;
      automaticTimerDeadline.current = nextSchedule.deadlineAt;
      automaticProgressDeadline.current = nextSchedule.progressDeadlineAt ?? null;
      automaticTimer.current = window.setTimeout(
        () => {
          automaticTimer.current = null;
          automaticTimerPolicy.current = null;
          automaticTimerDeadline.current = null;
          automaticProgressDeadline.current = null;
          void runSyncRef.current?.(false).catch(() => undefined);
        },
        Math.max(0, nextSchedule.deadlineAt - now),
      );
    },
    [clearScheduledSync],
  );
  scheduleAutomaticSyncRef.current = scheduleAutomaticSync;

  const runSync = useCallback(
    async (manual: boolean) => {
      if (manual) clearScheduledSync();
      if (inFlight.current) return inFlight.current;

      const operation = Promise.resolve().then(async () => {
        const revisionAtStart = localMutationRevision.current;
        let attempted = false;
        let succeeded = false;

        try {
          if (!isSignedIn) {
            setStatus("idle");
            return;
          }
          if (!navigator.onLine) {
            setStatus("offline");
            return;
          }

          attempted = true;
          if (!(await checkAccess())) {
            throw new Error("This account is not authorized to use Awthor cloud features.");
          }

          setStatus("syncing");
          const state = stateRef.current ?? readSyncDeviceState(window.localStorage);
          const next = await syncRepository({
            onApplyingRemoteChange: (applying) => {
              applyingRemoteChange.current = applying;
            },
            repository,
            state: { ...state, lastAttemptAt: new Date().toISOString() },
          });
          stateRef.current = next;
          writeSyncDeviceState(window.localStorage, next);
          setLastSuccessfulSyncAt(next.lastSuccessfulSyncAt);
          if (localMutationRevision.current === revisionAtStart) {
            hasLocalChanges.current = false;
          }
          failureCount.current = 0;
          backoffUntil.current = 0;
          succeeded = true;
          setStatus("idle");
        } catch (error) {
          failureCount.current += 1;
          backoffUntil.current = Date.now() + getSyncBackoffDelayMs(failureCount.current);
          const next = {
            ...(stateRef.current ?? readSyncDeviceState(window.localStorage)),
            lastAttemptAt: new Date().toISOString(),
            lastError: error instanceof Error ? error.message : "Sync could not be completed.",
          };
          stateRef.current = next;
          writeSyncDeviceState(window.localStorage, next);
          setStatus("error");
          throw error;
        } finally {
          inFlight.current = null;
          const queuedTrailingPolicy = trailingPolicy.current;
          trailingPolicy.current = null;
          const changedDuringSync = localMutationRevision.current > revisionAtStart;

          if (changedDuringSync || queuedTrailingPolicy) {
            hasLocalChanges.current = true;
            scheduleAutomaticSyncRef.current?.(queuedTrailingPolicy ?? "deferred");
          } else if (
            attempted &&
            !succeeded &&
            hasLocalChanges.current &&
            navigator.onLine &&
            accessRef.current === "authorized"
          ) {
            scheduleAutomaticSyncRef.current?.("immediate");
          }
        }
      });
      inFlight.current = operation;
      return operation;
    },
    [checkAccess, clearScheduledSync, isSignedIn],
  );
  runSyncRef.current = runSync;

  const syncNow = useCallback(async () => runSync(true), [runSync]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !syncStateLoaded) return;

    const markLocalChange = (policy: AutomaticSyncPolicy) => {
      localMutationRevision.current += 1;
      hasLocalChanges.current = true;
      scheduleAutomaticSync(policy, true);
    };
    const scheduleForegroundSync = () => {
      const lastSuccess = stateRef.current?.lastSuccessfulSyncAt ?? null;
      if (hasLocalChanges.current || isSuccessfulSyncStale(lastSuccess)) {
        scheduleAutomaticSync("immediate");
        return true;
      }
      return false;
    };
    const onOnline = () => {
      if (!scheduleForegroundSync()) setStatus("idle");
    };
    const onOffline = () => {
      clearScheduledSync();
      setStatus("offline");
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") scheduleForegroundSync();
    };
    const onMutation = (event: Event) => {
      if (applyingRemoteChange.current) return;
      const mutation = readRepositoryMutation(event);
      if (mutation.syncPolicy === "local-only") return;
      markLocalChange(mutation.syncPolicy);
    };
    const onDeletion = (event: Event) => {
      if (applyingRemoteChange.current) return;
      const deletions = (event as CustomEvent<readonly SyncDeletion[]>).detail;
      if (!Array.isArray(deletions) || deletions.length === 0) return;
      const state = stateRef.current ?? readSyncDeviceState(window.localStorage);
      void queueSyncDeletions(state, deletions, new Date().toISOString())
        .then((next) => {
          stateRef.current = next;
          writeSyncDeviceState(window.localStorage, next);
          markLocalChange("immediate");
        })
        .catch(() => {
          setStatus("error");
        });
    };

    if (initialAutoSyncUserId.current !== activeUserId) {
      initialAutoSyncUserId.current = activeUserId;
      const lastSuccess = stateRef.current?.lastSuccessfulSyncAt ?? null;
      if (lastSuccess && isSuccessfulSyncStale(lastSuccess)) {
        scheduleAutomaticSync("immediate");
      }
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("focus", scheduleForegroundSync);
    window.addEventListener(repositoryMutatedEventName, onMutation);
    window.addEventListener(repositoryDeletedEventName, onDeletion);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearScheduledSync();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("focus", scheduleForegroundSync);
      window.removeEventListener(repositoryMutatedEventName, onMutation);
      window.removeEventListener(repositoryDeletedEventName, onDeletion);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    activeUserId,
    clearScheduledSync,
    isLoaded,
    isSignedIn,
    scheduleAutomaticSync,
    syncStateLoaded,
  ]);

  useEffect(() => {
    if (access === "unauthorized") clearScheduledSync();
  }, [access, clearScheduledSync]);

  useEffect(() => clearScheduledSync, [clearScheduledSync]);

  const value = useMemo<SyncContextValue>(
    () => ({
      access,
      configured: true,
      lastSuccessfulSyncAt,
      signedIn: Boolean(isSignedIn),
      status,
      syncNow,
    }),
    [access, isSignedIn, lastSuccessfulSyncAt, status, syncNow],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) throw new Error("useSync must be used inside SyncProvider.");
  return context;
}
