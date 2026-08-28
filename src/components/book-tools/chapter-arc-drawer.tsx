"use client";

import { Activity, AlertCircle, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type Chapter,
  type ChapterArc,
  type ChapterArcStage,
  chapterArcStages,
  createDefaultChapterArc,
  getAwthorRepository,
} from "@/lib/repository";
import { cn } from "@/lib/utils";

type ChapterArcDrawerProps = {
  bookId: string;
  chapters: readonly Chapter[];
  currentChapterId: string;
  open: boolean;
  onChapterUpdated: (chapter: Chapter) => void;
  onDirtyChange: (dirty: boolean) => void;
  onOpenChange: (open: boolean) => void;
};

const repository = getAwthorRepository();

export function ChapterArcDrawer({
  bookId,
  chapters,
  currentChapterId,
  onChapterUpdated,
  onDirtyChange,
  onOpenChange,
  open,
}: ChapterArcDrawerProps) {
  const [arcDraft, setArcDraft] = useState<ChapterArc>(createDefaultChapterArc);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [selectedChapterId, setSelectedChapterId] = useState(currentChapterId);
  const previousCurrentChapterIdRef = useRef(currentChapterId);
  const wasOpenRef = useRef(false);

  const selectedChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === selectedChapterId) ?? null,
    [chapters, selectedChapterId],
  );
  const isDirty = Boolean(
    selectedChapter && JSON.stringify(selectedChapter.arc) !== JSON.stringify(arcDraft),
  );

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  function canDiscardArc() {
    return !isDirty || window.confirm("Discard the unsaved chapter arc changes and continue?");
  }

  function requestOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
  }

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    const chapterChanged = previousCurrentChapterIdRef.current !== currentChapterId;
    wasOpenRef.current = open;
    previousCurrentChapterIdRef.current = currentChapterId;

    if (!open) {
      return;
    }
    if (wasOpen && !chapterChanged) {
      return;
    }
    const nextChapter =
      chapters.find((chapter) => chapter.id === currentChapterId) ?? chapters[0] ?? null;
    setSelectedChapterId(nextChapter?.id ?? "");
    setArcDraft(nextChapter?.arc ?? createDefaultChapterArc());
    setError(null);
    setSaveState("idle");
  }, [chapters, currentChapterId, open]);

  function selectChapter(chapter: Chapter) {
    if (chapter.id !== selectedChapterId && !canDiscardArc()) {
      return;
    }
    setSelectedChapterId(chapter.id);
    setArcDraft(chapter.arc);
    setError(null);
    setSaveState("idle");
  }

  function updateArc<Key extends keyof ChapterArc>(field: Key, value: ChapterArc[Key]) {
    setArcDraft((current) => ({ ...current, [field]: value }));
    setSaveState("idle");
  }

  async function saveArc() {
    if (!selectedChapter) {
      return;
    }

    setError(null);
    setSaveState("saving");
    try {
      const updated = await repository.updateChapter(bookId, selectedChapter.id, { arc: arcDraft });
      onChapterUpdated(updated);
      setArcDraft(updated.arc);
      setSaveState("saved");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "The chapter arc could not be saved.",
      );
      setSaveState("idle");
    }
  }

  return (
    <Drawer onOpenChange={requestOpenChange} open={open}>
      <DrawerContent>
        <DrawerHeader>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            <Activity aria-hidden="true" className="size-3.5" />
            Story movement
          </div>
          <DrawerTitle className="mt-2">Chapter arc</DrawerTitle>
          <DrawerDescription>
            Shape each chapter’s stage, tension, goal, conflict, and outcome without leaving the
            draft.
          </DrawerDescription>
        </DrawerHeader>

        <DrawerBody className="flex flex-col overflow-hidden lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="flex max-h-[46dvh] min-h-0 flex-col border-b border-border bg-muted/20 lg:max-h-none lg:border-r lg:border-b-0">
            <TensionTrajectory
              chapters={chapters}
              onSelect={selectChapter}
              selectedChapterId={selectedChapterId}
            />
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              <ol className="space-y-1" aria-label="Chapter arcs">
                {chapters.map((chapter) => (
                  <li key={chapter.id}>
                    <button
                      aria-current={chapter.id === selectedChapterId ? "true" : undefined}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        chapter.id === selectedChapterId ? "bg-accent" : "hover:bg-muted",
                      )}
                      onClick={() => selectChapter(chapter)}
                      type="button"
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-background text-xs font-semibold tabular-nums">
                        {chapter.number}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {chapter.title}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>{chapter.arc.stage}</span>
                          <span aria-hidden="true">·</span>
                          <span>Tension {chapter.arc.tension}/5</span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              {chapters.length === 0 ? (
                <p className="p-4 text-sm leading-6 text-muted-foreground">
                  Add a chapter before mapping its arc.
                </p>
              ) : null}
            </div>
          </aside>

          <section className="min-h-0 overflow-y-auto p-4 sm:p-6" aria-label="Chapter arc editor">
            {selectedChapter ? (
              <form
                className="mx-auto max-w-2xl space-y-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveArc();
                }}
              >
                <div className="border-b border-border pb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Chapter {String(selectedChapter.number).padStart(2, "0")}
                  </p>
                  <h3 className="mt-1 font-heading text-2xl font-semibold">
                    {selectedChapter.title}
                  </h3>
                </div>

                {error ? (
                  <div
                    className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                    role="alert"
                  >
                    <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    {error}
                  </div>
                ) : null}

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="chapter-arc-stage">Arc stage</Label>
                    <Select
                      onValueChange={(value) =>
                        value && updateArc("stage", value as ChapterArcStage)
                      }
                      value={arcDraft.stage}
                    >
                      <SelectTrigger className="h-10 w-full" id="chapter-arc-stage">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {chapterArcStages.map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {stage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="chapter-arc-tension">Tension</Label>
                      <Badge variant="secondary">{arcDraft.tension} / 5</Badge>
                    </div>
                    <input
                      aria-valuetext={`${arcDraft.tension} out of 5`}
                      className="w-full cursor-pointer accent-primary"
                      id="chapter-arc-tension"
                      max="5"
                      min="1"
                      onChange={(event) =>
                        updateArc("tension", Number(event.target.value) as ChapterArc["tension"])
                      }
                      step="1"
                      type="range"
                      value={arcDraft.tension}
                    />
                    <div
                      aria-hidden="true"
                      className="flex justify-between text-xs text-muted-foreground"
                    >
                      <span>Quiet</span>
                      <span>Intense</span>
                    </div>
                  </div>
                </div>

                <ArcField
                  id="chapter-arc-goal"
                  label="Goal"
                  onChange={(value) => updateArc("goal", value)}
                  placeholder="What must this chapter accomplish?"
                  value={arcDraft.goal}
                />
                <ArcField
                  id="chapter-arc-conflict"
                  label="Conflict"
                  onChange={(value) => updateArc("conflict", value)}
                  placeholder="What blocks the character or raises the cost?"
                  value={arcDraft.conflict}
                />
                <ArcField
                  id="chapter-arc-outcome"
                  label="Outcome"
                  onChange={(value) => updateArc("outcome", value)}
                  placeholder="What changes by the chapter’s end?"
                  value={arcDraft.outcome}
                />

                <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-2xl border border-border bg-popover/95 p-3 backdrop-blur">
                  <span aria-live="polite" className="text-xs text-muted-foreground">
                    {saveState === "saving"
                      ? "Saving arc…"
                      : saveState === "saved"
                        ? "Saved on this device"
                        : "Changes stay local"}
                  </span>
                  <Button disabled={saveState === "saving"} size="sm" type="submit">
                    <Save aria-hidden="true" />
                    Save arc
                  </Button>
                </div>
              </form>
            ) : (
              <section className="grid min-h-72 place-items-center text-center">
                <div className="max-w-sm">
                  <Activity aria-hidden="true" className="mx-auto mb-3 size-7 text-primary" />
                  <h3 className="font-heading text-lg font-semibold">No chapter selected</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Choose a chapter from the list to edit its story movement.
                  </p>
                </div>
              </section>
            )}
          </section>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function TensionTrajectory({
  chapters,
  onSelect,
  selectedChapterId,
}: {
  chapters: readonly Chapter[];
  onSelect: (chapter: Chapter) => void;
  selectedChapterId: string;
}) {
  return (
    <figure className="shrink-0 border-b border-border p-4">
      <figcaption className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold">
        Tension trajectory
        <span className="text-xs font-normal text-muted-foreground">1–5</span>
      </figcaption>
      <ol className="flex h-24 items-end gap-1.5" aria-label="Tension by chapter">
        {chapters.map((chapter) => (
          <li className="flex h-full min-w-0 flex-1 items-end" key={chapter.id}>
            <button
              aria-label={`Chapter ${chapter.number}, ${chapter.title}, tension ${chapter.arc.tension} out of 5`}
              className={cn(
                "w-full min-w-2 rounded-t-sm bg-primary/30 transition-[height,background-color] hover:bg-primary/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
                chapter.id === selectedChapterId && "bg-primary",
              )}
              onClick={() => onSelect(chapter)}
              style={{ height: `${chapter.arc.tension * 20}%` }}
              type="button"
            />
          </li>
        ))}
      </ol>
    </figure>
  );
}

function ArcField({
  id,
  label,
  onChange,
  placeholder,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        value={value}
      />
    </div>
  );
}
