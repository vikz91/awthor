"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Cloud, CloudCheck, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSyncAccountConfigured } from "@/components/auth-provider";
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
import { getSyncAccountPresentation } from "@/lib/auth/presentation";
import { fillMissingProfileEmail } from "@/lib/auth/profile";
import { getAwthorRepository } from "@/lib/repository";
import { cn } from "@/lib/utils";

const repository = getAwthorRepository();

const accountMenuItems = [
  { href: "/books?settings=open", label: "Awthor settings" },
  { href: "/books?new=open", label: "New book" },
  { href: "/books", label: "Your library" },
];

export function AccountMenu() {
  const configured = useSyncAccountConfigured();
  return configured ? <ConfiguredAccountMenu /> : null;
}

function ConfiguredAccountMenu() {
  const { isSignedIn } = useUser();
  return (
    isSignedIn && (
      <UserButton
        appearance={{ elements: { avatarBox: "size-8" } }}
        customMenuItems={accountMenuItems}
      />
    )
  );
}

type SyncAccountActionProps = {
  variant: "landing-header" | "landing-hero" | "library";
};

export function SyncAccountAction({ variant }: SyncAccountActionProps) {
  const configured = useSyncAccountConfigured();

  return configured ? (
    <ConfiguredSyncAccountAction variant={variant} />
  ) : (
    <LocalOnlyAction variant={variant} />
  );
}

function LocalOnlyAction({ variant }: SyncAccountActionProps) {
  const [open, setOpen] = useState(false);
  const presentation = getSyncAccountPresentation({ configured: false, signedIn: false });

  return (
    <>
      <ActionTrigger onClick={() => setOpen(true)} presentation={presentation} variant={variant} />
      <SyncAccountDialog onOpenChange={setOpen} open={open} presentation={presentation} />
    </>
  );
}

function ConfiguredSyncAccountAction({ variant }: SyncAccountActionProps) {
  const [open, setOpen] = useState(false);
  const { isLoaded, isSignedIn, user } = useUser();
  const { status, syncNow } = useSync();
  const clerkEmail = user?.primaryEmailAddress?.emailAddress;

  useEffect(() => {
    if (!isSignedIn || !clerkEmail) {
      return;
    }

    let current = true;

    async function fillProfileEmail() {
      const migration = await repository.initialize();
      if (migration.status === "failed" || !current) {
        return;
      }

      const profile = await repository.profile.get();
      const nextProfile = fillMissingProfileEmail(profile, clerkEmail);

      if (current && nextProfile !== profile && nextProfile) {
        await repository.profile.save(nextProfile);
      }
    }

    void fillProfileEmail().catch(() => {
      // Local storage failures are surfaced in Awthor's existing settings and library flows.
    });

    return () => {
      current = false;
    };
  }, [clerkEmail, isSignedIn]);
  const presentation = getSyncAccountPresentation({
    configured: true,
    signedIn: Boolean(isSignedIn),
  });

  async function handleAction() {
    if (!isSignedIn) {
      setOpen(true);
      return;
    }

    try {
      await syncNow();
    } catch {
      setOpen(true);
    }
  }

  return (
    <>
      <ActionTrigger
        loading={!isLoaded || status === "syncing"}
        onClick={() => void handleAction()}
        presentation={presentation}
        variant={variant}
      />
      {isSignedIn && variant === "library" && <AccountMenu />}
      <SyncAccountDialog
        configured
        onOpenChange={setOpen}
        open={open}
        presentation={presentation}
        signedIn={Boolean(isSignedIn)}
      />
    </>
  );
}

type ActionTriggerProps = {
  loading?: boolean;
  onClick: () => void;
  presentation: ReturnType<typeof getSyncAccountPresentation>;
  variant: SyncAccountActionProps["variant"];
};

function ActionTrigger({ loading = false, onClick, presentation, variant }: ActionTriggerProps) {
  const isHero = variant === "landing-hero";
  const isLibrary = variant === "library";
  const Icon = presentation.statusLabel === "Ready to sync" ? CloudCheck : Cloud;

  return (
    <Button
      aria-label={presentation.actionLabel}
      onClick={onClick}
      size={isHero ? "lg" : "default"}
      variant={isHero ? "outline" : isLibrary ? "ghost" : "outline"}
    >
      {loading ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" />
      ) : (
        <Icon aria-hidden="true" />
      )}
      <span className={cn(variant === "landing-header" && "hidden sm:inline")}>
        {presentation.actionLabel}
      </span>
    </Button>
  );
}

type SyncAccountDialogProps = {
  configured?: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  presentation: ReturnType<typeof getSyncAccountPresentation>;
  signedIn?: boolean;
};

function SyncAccountDialog({
  configured = false,
  onOpenChange,
  open,
  presentation,
  signedIn = false,
}: SyncAccountDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Optional sync</DialogTitle>
          <DialogDescription>{presentation.detail}</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-border bg-muted/60 px-3 py-3 text-sm leading-6 text-muted-foreground">
          Signing in alone never uploads your writing. Selecting Sync copies your manuscript, author
          profile, and settings while keeping the local copy on this device.
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Close
          </Button>
          {configured && !signedIn && (
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
