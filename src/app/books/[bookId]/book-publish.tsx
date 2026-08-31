"use client";

import { Check, ExternalLink, Globe2, LoaderCircle, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSync } from "@/components/sync-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Publication = {
  publicId: string;
  publishedAt: string;
  updatedAt: string;
  url: string;
};

type PublishState = "idle" | "loading" | "publishing" | "unpublishing" | "error";

export function BookPublish({ bookId }: { bookId: string }) {
  const { configured, signedIn, status: syncStatus, syncNow } = useSync();
  const [publication, setPublication] = useState<Publication | null>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PublishState>("loading");
  const [message, setMessage] = useState("Checking publishing status…");

  const load = useCallback(async () => {
    if (!configured || !signedIn) {
      setPublication(null);
      setState("idle");
      setMessage(
        configured ? "Sync this book before publishing." : "Publishing is unavailable here.",
      );
      return;
    }

    setState("loading");
    try {
      const response = await fetch(`/api/publish/${encodeURIComponent(bookId)}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as Publication | { published: false };
      setPublication("publicId" in data ? data : null);
      setState("idle");
      setMessage("publicId" in data ? "Story is published." : "This book is private.");
    } catch {
      setState("error");
      setMessage("Publishing status could not be loaded.");
    }
  }, [bookId, configured, signedIn]);

  useEffect(() => {
    void load();
  }, [load]);

  async function publish() {
    if (!configured || !signedIn) {
      setState("error");
      setMessage("Sign in and sync this book before publishing.");
      return;
    }

    setState("publishing");
    setMessage("Syncing and publishing your story…");
    try {
      await syncNow();
      const response = await fetch(`/api/publish/${encodeURIComponent(bookId)}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as Publication;
      setPublication(data);
      setState("idle");
      setMessage(publication ? "Published version updated." : "Story published.");
    } catch {
      setState("error");
      setMessage("Could not publish this story. Check Sync and try again.");
    }
  }

  async function unpublish() {
    if (!publication) return;
    if (
      !window.confirm("Turn off public access to this story? Your local book will not be deleted.")
    ) {
      return;
    }

    setState("unpublishing");
    setMessage("Turning off public access…");
    try {
      const response = await fetch(`/api/publish/${encodeURIComponent(bookId)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
      setPublication(null);
      setState("idle");
      setMessage("Public access turned off.");
    } catch {
      setState("error");
      setMessage("Could not turn off publishing. Try again.");
    }
  }

  const working = state === "loading" || state === "publishing" || state === "unpublishing";
  const label = publication ? "Published story" : "Publish story";
  const Icon = working ? LoaderCircle : publication ? Check : Globe2;

  return (
    <>
      <Button
        aria-label={`${label}. ${message}`}
        className={cn(state === "error" && "text-destructive")}
        disabled={working || syncStatus === "syncing"}
        onClick={() => setOpen(true)}
        size="icon-sm"
        title={message}
        variant="ghost"
      >
        <Icon
          aria-hidden="true"
          className={cn(working && "animate-spin motion-reduce:animate-none")}
        />
      </Button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="gap-4 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{publication ? "Public story" : "Publish this story"}</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </DialogHeader>
          {publication ? (
            <p className="text-xs text-muted-foreground">
              Last published {formatDate(publication.updatedAt)}
            </p>
          ) : null}
          {!configured || !signedIn ? (
            <p className="text-xs leading-5 text-muted-foreground">
              Sign in and select Sync before publishing. Nothing is uploaded until you do.
            </p>
          ) : null}
          <DialogFooter>
            {publication ? (
              <>
                <Button
                  disabled={working}
                  onClick={() => void unpublish()}
                  type="button"
                  variant="destructive"
                >
                  <Trash2 aria-hidden="true" /> Turn off publishing
                </Button>
                <Button disabled={working} onClick={() => void publish()} type="button">
                  <Send aria-hidden="true" /> Republish
                </Button>
                <Button
                  onClick={() => window.open(publication.url, "_blank", "noopener,noreferrer")}
                  type="button"
                  variant="outline"
                >
                  <ExternalLink aria-hidden="true" /> Open story
                </Button>
              </>
            ) : (
              <Button
                disabled={working || !configured || !signedIn}
                onClick={() => void publish()}
                type="button"
              >
                <Send aria-hidden="true" /> Publish public page
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
