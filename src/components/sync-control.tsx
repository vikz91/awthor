"use client";

import { SignInButton } from "@clerk/nextjs";
import { Check, CloudOff, CloudUpload, LoaderCircle, TriangleAlert } from "lucide-react";
import { useEffect, useReducer, useState } from "react";
import { useSync } from "@/components/sync-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  readRepositoryMutation,
  repositoryDeletedEventName,
  repositoryMutatedEventName,
} from "@/lib/repository";
import type { SyncStatus } from "@/lib/sync/types";
import { cn } from "@/lib/utils";

type SyncControlProps = {
  mobileVisibility?: "contextual" | "persistent";
  variant: "navbar" | "settings";
};

export const navbarSyncSuccessDurationMs = 1_000;

export type NavbarSyncFeedbackState = {
  hasPendingLocalChanges: boolean;
  showSuccess: boolean;
  wasSyncing: boolean;
};

export type NavbarSyncFeedbackAction =
  | { type: "local-change" }
  | { type: "status-change"; status: SyncStatus }
  | { type: "success-expired" };

export const initialNavbarSyncFeedback: NavbarSyncFeedbackState = {
  hasPendingLocalChanges: false,
  showSuccess: false,
  wasSyncing: false,
};

export function reduceNavbarSyncFeedback(
  state: NavbarSyncFeedbackState,
  action: NavbarSyncFeedbackAction,
): NavbarSyncFeedbackState {
  if (action.type === "local-change") {
    return { ...state, hasPendingLocalChanges: true, showSuccess: false };
  }
  if (action.type === "success-expired") {
    return { ...state, showSuccess: false };
  }
  if (action.status === "syncing") {
    return { ...state, showSuccess: false, wasSyncing: true };
  }
  if (action.status === "idle" && state.wasSyncing) {
    return { hasPendingLocalChanges: false, showSuccess: true, wasSyncing: false };
  }
  return { ...state, showSuccess: false, wasSyncing: false };
}

export function shouldShowNavbarSyncOnMobile({
  feedback,
  hasPersistentFailure = false,
  lastSuccessfulSyncAt,
  status,
}: {
  feedback: NavbarSyncFeedbackState;
  hasPersistentFailure?: boolean;
  lastSuccessfulSyncAt: string | null;
  status: SyncStatus;
}) {
  return (
    status !== "idle" ||
    hasPersistentFailure ||
    feedback.hasPendingLocalChanges ||
    feedback.showSuccess ||
    lastSuccessfulSyncAt === null
  );
}

export function shouldMarkRepositoryMutationPending(event: Event) {
  return readRepositoryMutation(event).syncPolicy !== "local-only";
}

function formatLastSync(value: string | null) {
  if (!value) return "Not synced yet";
  return `Last synced ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))}`;
}

export function SyncControl({ mobileVisibility = "contextual", variant }: SyncControlProps) {
  const { access, configured, lastSuccessfulSyncAt, signedIn, status, syncNow } = useSync();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navbarFeedback, dispatchNavbarFeedback] = useReducer(
    reduceNavbarSyncFeedback,
    initialNavbarSyncFeedback,
  );
  const label = variant === "settings" ? "Sync now" : "Sync";
  const description =
    signedIn && access === "unauthorized"
      ? "This account is not authorized to use Awthor cloud features. Your books remain on this device."
      : signedIn && access === "checking"
        ? "Checking whether this account can use cloud sync…"
        : status === "syncing"
          ? "Syncing your local writing workspace…"
          : status === "offline"
            ? "Waiting for an internet connection."
            : status === "error"
              ? "Sync failed. Select Sync to retry."
              : formatLastSync(lastSuccessfulSyncAt);
  const Icon =
    status === "syncing"
      ? LoaderCircle
      : status === "offline"
        ? CloudOff
        : status === "error"
          ? TriangleAlert
          : CloudUpload;
  const hasPersistentNavbarFailure = Boolean(error) || (signedIn && access === "unauthorized");
  const NavbarIcon = hasPersistentNavbarFailure
    ? TriangleAlert
    : navbarFeedback.showSuccess
      ? Check
      : Icon;
  const navbarDescription =
    error ?? (!hasPersistentNavbarFailure && navbarFeedback.showSuccess ? "Synced" : description);
  const showNavbarOnMobile =
    mobileVisibility === "persistent" ||
    shouldShowNavbarSyncOnMobile({
      feedback: navbarFeedback,
      hasPersistentFailure: hasPersistentNavbarFailure,
      lastSuccessfulSyncAt,
      status,
    });

  useEffect(() => {
    if (variant !== "navbar") return;
    const onMutation = (event: Event) => {
      if (shouldMarkRepositoryMutationPending(event)) {
        dispatchNavbarFeedback({ type: "local-change" });
      }
    };
    const onDeletion = () => dispatchNavbarFeedback({ type: "local-change" });
    window.addEventListener(repositoryMutatedEventName, onMutation);
    window.addEventListener(repositoryDeletedEventName, onDeletion);
    return () => {
      window.removeEventListener(repositoryMutatedEventName, onMutation);
      window.removeEventListener(repositoryDeletedEventName, onDeletion);
    };
  }, [variant]);

  useEffect(() => {
    if (variant !== "navbar") return;
    dispatchNavbarFeedback({ type: "status-change", status });
  }, [status, variant]);

  useEffect(() => {
    if (variant !== "navbar" || !navbarFeedback.showSuccess) return;
    const timer = window.setTimeout(
      () => dispatchNavbarFeedback({ type: "success-expired" }),
      navbarSyncSuccessDurationMs,
    );
    return () => window.clearTimeout(timer);
  }, [navbarFeedback.showSuccess, variant]);

  async function handleSync() {
    if (!configured || !signedIn) {
      setOpen(true);
      return;
    }
    if (access === "unauthorized") {
      setError("This account is not authorized to use Awthor cloud features.");
      return;
    }
    setError(null);
    try {
      await syncNow();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sync could not be completed.");
    }
  }

  if (variant === "settings") {
    return (
      <section
        aria-labelledby="sync-settings-title"
        className="rounded-xl border border-border bg-muted/40 p-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium" id="sync-settings-title">
              Optional sync
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
          </div>
          <Button
            disabled={status === "syncing" || (signedIn && access === "checking")}
            onClick={() => void handleSync()}
            size="sm"
          >
            <Icon aria-hidden="true" className={cn(status === "syncing" && "animate-spin")} />
            {label}
          </Button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        <SyncAccountDialog configured={configured} onOpenChange={setOpen} open={open} />
      </section>
    );
  }

  return (
    <>
      <span className="inline-flex size-11 shrink-0 items-center justify-center lg:hidden">
        {showNavbarOnMobile && (
          <Button
            aria-label={`${label}. ${navbarDescription}`}
            className="size-11"
            disabled={status === "syncing" || (signedIn && access === "checking")}
            onClick={() => void handleSync()}
            size="icon-lg"
            title={navbarDescription}
            variant="ghost"
          >
            <NavbarIcon aria-hidden="true" className={cn(status === "syncing" && "animate-spin")} />
          </Button>
        )}
      </span>
      <Button
        aria-label={`${label}. ${navbarDescription}`}
        className="hidden lg:inline-flex"
        disabled={status === "syncing" || (signedIn && access === "checking")}
        onClick={() => void handleSync()}
        size="sm"
        title={navbarDescription}
        variant="ghost"
      >
        <NavbarIcon aria-hidden="true" className={cn(status === "syncing" && "animate-spin")} />
        <span>{label}</span>
      </Button>
      <SyncAccountDialog configured={configured} onOpenChange={setOpen} open={open} />
    </>
  );
}

function SyncAccountDialog({
  configured,
  onOpenChange,
  open,
}: {
  configured: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const description = configured
    ? "Sign in with an email code, then choose Sync to copy this writing workspace to your Awthor account. Signing in alone never uploads your books."
    : "Sync is not configured for this Awthor installation. Your writing remains available on this device.";
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Sync your writing</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Close
          </Button>
          {configured && (
            <SignInButton mode="modal">
              <button className={cn(buttonVariants({ variant: "default" }))} type="button">
                Continue with email
              </button>
            </SignInButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
