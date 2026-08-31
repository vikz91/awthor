"use client";

import { SignInButton } from "@clerk/nextjs";
import { CloudOff, CloudUpload, LoaderCircle, TriangleAlert } from "lucide-react";
import { useState } from "react";
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
import { cn } from "@/lib/utils";

type SyncControlProps = { variant: "navbar" | "settings" };

function formatLastSync(value: string | null) {
  if (!value) return "Not synced yet";
  return `Last synced ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))}`;
}

export function SyncControl({ variant }: SyncControlProps) {
  const { configured, lastSuccessfulSyncAt, signedIn, status, syncNow } = useSync();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = variant === "settings" ? "Sync now" : "Sync";
  const description =
    status === "syncing"
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

  async function handleSync() {
    if (!configured || !signedIn) {
      setOpen(true);
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
          <Button disabled={status === "syncing"} onClick={() => void handleSync()} size="sm">
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
      <Button
        aria-label={`${label}. ${description}`}
        disabled={status === "syncing"}
        onClick={() => void handleSync()}
        size="sm"
        title={description}
        variant="ghost"
      >
        <Icon aria-hidden="true" className={cn(status === "syncing" && "animate-spin")} />
        <span className="hidden sm:inline">{label}</span>
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
