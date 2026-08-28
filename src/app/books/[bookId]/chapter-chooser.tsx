"use client";

import { ArrowDown, ArrowUp, Check, FilePlus2, Pencil, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Chapter } from "@/lib/repository";
import { cn } from "@/lib/utils";

type ChapterChooserProps = {
  chapters: readonly Chapter[];
  currentChapterId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (chapterId: string) => Promise<void>;
  onAdd: () => Promise<void>;
  onRename: (chapterId: string, title: string) => Promise<void>;
  onMove: (chapterId: string, direction: -1 | 1) => Promise<void>;
  onDelete: (chapterId: string) => Promise<void>;
};

export function ChapterChooser({
  chapters,
  currentChapterId,
  onAdd,
  onDelete,
  onMove,
  onOpenChange,
  onRename,
  onSelect,
  open,
}: ChapterChooserProps) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setEditingId(null);
      setConfirmingDeleteId(null);
      setError(null);
    }
  }, [open]);

  const filteredChapters = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return chapters;
    }

    return chapters.filter((chapter) =>
      `${chapter.number} ${chapter.title}`.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [chapters, query]);

  async function run(actionId: string, action: () => Promise<void>) {
    setBusyAction(actionId);
    setError(null);

    try {
      await action();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "That chapter change could not be saved.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  function beginRename(chapter: Chapter) {
    setEditingId(chapter.id);
    setEditingTitle(chapter.title);
    setConfirmingDeleteId(null);
  }

  async function commitRename(chapterId: string) {
    const title = editingTitle.trim();
    if (!title) {
      setError("A chapter needs a title.");
      return;
    }

    await run(`rename:${chapterId}`, async () => {
      await onRename(chapterId, title);
      setEditingId(null);
    });
  }

  const confirmingChapter = chapters.find((chapter) => chapter.id === confirmingDeleteId);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex h-[min(46rem,calc(100dvh-1rem))] max-h-[calc(100dvh-1rem)] flex-col gap-4 overflow-hidden p-0 sm:h-[min(46rem,calc(100dvh-2rem))] sm:max-h-[calc(100dvh-2rem)] sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b border-border px-5 pt-5 pb-4 sm:px-6">
          <DialogTitle className="text-xl">Chapters</DialogTitle>
          <DialogDescription>
            Choose a chapter or keep the manuscript structure tidy without leaving this book.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 px-5 sm:px-6">
          <label className="relative block" htmlFor="chapter-search">
            <span className="sr-only">Search chapters</span>
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="h-10 bg-muted/60 pl-9"
              id="chapter-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search chapters…"
              value={query}
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-3 [scrollbar-gutter:stable] sm:px-4">
          {filteredChapters.length === 0 ? (
            <p className="px-3 py-12 text-center text-sm text-muted-foreground">
              No chapters match “{query}”.
            </p>
          ) : (
            <ol className="space-y-1 pb-2">
              {filteredChapters.map((chapter) => {
                const originalIndex = chapters.findIndex((item) => item.id === chapter.id);
                const isCurrent = chapter.id === currentChapterId;
                const isEditing = chapter.id === editingId;
                const disabled = busyAction !== null;

                return (
                  <li
                    className={cn(
                      "group rounded-2xl border transition-colors",
                      isCurrent
                        ? "border-primary/30 bg-primary/8"
                        : "border-transparent hover:border-border hover:bg-muted/50",
                    )}
                    key={chapter.id}
                  >
                    <div className="flex min-w-0 items-center gap-2 p-2">
                      {isEditing ? (
                        <form
                          className="flex min-w-0 flex-1 items-center gap-2"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void commitRename(chapter.id);
                          }}
                        >
                          <Input
                            aria-label={`Rename chapter ${chapter.number}`}
                            autoFocus
                            disabled={disabled}
                            onChange={(event) => setEditingTitle(event.target.value)}
                            value={editingTitle}
                          />
                          <Button
                            aria-label="Save chapter title"
                            disabled={disabled}
                            size="icon"
                            type="submit"
                            variant="ghost"
                          >
                            <Check aria-hidden="true" />
                          </Button>
                        </form>
                      ) : (
                        <button
                          className="min-w-0 flex-1 rounded-xl px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          disabled={disabled}
                          onClick={() =>
                            void run(`select:${chapter.id}`, () => onSelect(chapter.id))
                          }
                          type="button"
                        >
                          <span className="block text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                            Chapter {String(chapter.number).padStart(2, "0")}
                          </span>
                          <span className="mt-0.5 block truncate font-heading text-base font-medium">
                            {chapter.title}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {chapter.wordCount.toLocaleString()} words · {chapter.status}
                          </span>
                        </button>
                      )}

                      {!isEditing ? (
                        <div className="flex shrink-0 items-center">
                          <Button
                            aria-label={`Move ${chapter.title} up`}
                            disabled={disabled || originalIndex === 0}
                            onClick={() =>
                              void run(`move-up:${chapter.id}`, () => onMove(chapter.id, -1))
                            }
                            size="icon-sm"
                            title="Move up"
                            variant="ghost"
                          >
                            <ArrowUp aria-hidden="true" />
                          </Button>
                          <Button
                            aria-label={`Move ${chapter.title} down`}
                            disabled={disabled || originalIndex === chapters.length - 1}
                            onClick={() =>
                              void run(`move-down:${chapter.id}`, () => onMove(chapter.id, 1))
                            }
                            size="icon-sm"
                            title="Move down"
                            variant="ghost"
                          >
                            <ArrowDown aria-hidden="true" />
                          </Button>
                          <Button
                            aria-label={`Rename ${chapter.title}`}
                            disabled={disabled}
                            onClick={() => beginRename(chapter)}
                            size="icon-sm"
                            title="Rename"
                            variant="ghost"
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                          <Button
                            aria-label={`Delete ${chapter.title}`}
                            disabled={disabled || chapters.length === 1}
                            onClick={() => {
                              setEditingId(null);
                              setConfirmingDeleteId(chapter.id);
                            }}
                            size="icon-sm"
                            title={
                              chapters.length === 1 ? "A book must keep one chapter" : "Delete"
                            }
                            variant="ghost"
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {confirmingChapter ? (
          <section
            aria-label="Confirm chapter deletion"
            className="mx-5 shrink-0 rounded-2xl border border-destructive/30 bg-destructive/8 p-4 sm:mx-6"
          >
            <p className="font-medium">Delete “{confirmingChapter.title}”?</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Its manuscript cannot be recovered after deletion.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button onClick={() => setConfirmingDeleteId(null)} size="sm" variant="ghost">
                Keep chapter
              </Button>
              <Button
                disabled={busyAction !== null}
                onClick={() =>
                  void run(`delete:${confirmingChapter.id}`, async () => {
                    await onDelete(confirmingChapter.id);
                    setConfirmingDeleteId(null);
                  })
                }
                size="sm"
                variant="destructive"
              >
                Delete chapter
              </Button>
            </div>
          </section>
        ) : null}

        {error ? (
          <p aria-live="polite" className="shrink-0 px-5 text-sm text-destructive sm:px-6">
            {error}
          </p>
        ) : null}

        <DialogFooter className="shrink-0 border-t border-border px-5 py-4 sm:px-6">
          <Button
            disabled={busyAction !== null}
            onClick={() => void run("add", onAdd)}
            type="button"
          >
            <FilePlus2 aria-hidden="true" data-icon="inline-start" />
            New chapter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
