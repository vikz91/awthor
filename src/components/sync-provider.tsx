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
import { getAwthorRepository, repositoryDeletedEventName } from "@/lib/repository";
import { syncRepository } from "@/lib/sync/client";
import { readSyncDeviceState, writeSyncDeviceState } from "@/lib/sync/device-state";
import { queueSyncDeletions, type SyncDeletion } from "@/lib/sync/records";
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
  const { isLoaded, isSignedIn } = useUser();
  const stateRef = useRef<SyncDeviceState | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [access, setAccess] = useState<SyncContextValue["access"]>("checking");
  const [syncStateLoaded, setSyncStateLoaded] = useState(false);
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] = useState<string | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const applyingRemoteChange = useRef(false);
  const initialAutoSyncHandled = useRef(false);

  useEffect(() => {
    const state = readSyncDeviceState(window.localStorage);
    stateRef.current = state;
    setLastSuccessfulSyncAt(state.lastSuccessfulSyncAt);
    setSyncStateLoaded(true);
  }, []);

  const checkAccess = useCallback(async () => {
    if (!isSignedIn) {
      setAccess("checking");
      return false;
    }

    const response = await fetch("/api/sync/access", { credentials: "same-origin" });
    if (response.ok) {
      setAccess("authorized");
      return true;
    }
    if (response.status === 403) {
      setAccess("unauthorized");
      return false;
    }
    throw new Error("Sync account access is temporarily unavailable.");
  }, [isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;
    void checkAccess().catch(() => setStatus("error"));
  }, [checkAccess, isLoaded]);

  const syncNow = useCallback(async () => {
    if (!isSignedIn || !navigator.onLine) {
      setStatus(!navigator.onLine ? "offline" : "idle");
      return;
    }
    if (!(await checkAccess())) {
      setStatus("error");
      throw new Error("This account is not authorized to use Awthor cloud features.");
    }
    if (inFlight.current) return inFlight.current;

    const operation = (async () => {
      setStatus("syncing");
      const state = stateRef.current ?? readSyncDeviceState(window.localStorage);
      try {
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
        setStatus("idle");
      } catch (error) {
        const next = {
          ...(stateRef.current ?? state),
          lastAttemptAt: new Date().toISOString(),
          lastError: error instanceof Error ? error.message : "Sync could not be completed.",
        };
        stateRef.current = next;
        writeSyncDeviceState(window.localStorage, next);
        setStatus("error");
        throw error;
      } finally {
        inFlight.current = null;
      }
    })();
    inFlight.current = operation;
    return operation;
  }, [checkAccess, isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !syncStateLoaded || access !== "authorized") return;
    let timer: number | null = null;
    const schedule = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => void syncNow().catch(() => undefined), 800);
    };
    const onOnline = () => void syncNow().catch(() => undefined);
    const onVisibility = () => {
      if (document.visibilityState === "visible") onOnline();
    };
    const onMutation = () => {
      if (!applyingRemoteChange.current) schedule();
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
          schedule();
        })
        .catch(() => {
          setStatus("error");
        });
    };
    if (!initialAutoSyncHandled.current) {
      initialAutoSyncHandled.current = true;
      if (lastSuccessfulSyncAt) schedule();
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onOnline);
    window.addEventListener("awthor:repository-mutated", onMutation);
    window.addEventListener(repositoryDeletedEventName, onDeletion);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onOnline);
      window.removeEventListener("awthor:repository-mutated", onMutation);
      window.removeEventListener(repositoryDeletedEventName, onDeletion);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [access, isLoaded, isSignedIn, lastSuccessfulSyncAt, syncNow, syncStateLoaded]);

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
