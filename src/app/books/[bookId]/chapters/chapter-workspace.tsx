"use client";

import {
  ArrowLeft,
  BookOpenText,
  CheckCircle2,
  FileText,
  HardDrive,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChapterStatus = "Draft" | "Revision" | "Complete";

type Chapter = {
  id: string;
  number: number;
  title: string;
  summary: string;
  status: ChapterStatus;
  words: number;
  pov: string;
  body: string;
  lastEdited: string;
};

type ChapterWorkspaceProps = {
  bookId: string;
  title: string;
  chapterCount: number;
  wordCount: number;
  targetWords: number;
  currentChapterTitle: string;
  currentExcerpt: string;
};

type ChapterBlueprint = {
  title: string;
  summary: string;
  pov: string;
};

const chapterStatuses: ChapterStatus[] = ["Draft", "Revision", "Complete"];

const statusStyles: Record<ChapterStatus, string> = {
  Draft: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  Revision: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200",
  Complete: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
};

const chapterBlueprints: Record<string, ChapterBlueprint[]> = {
  "the-long-way-home": [
    {
      title: "The house with blue shutters",
      summary: "Mara arrives in Stillwater before the storm and finds the family house unchanged.",
      pov: "Mara Bell",
    },
    {
      title: "A letter in the flour tin",
      summary: "A hidden letter raises a question about the night Mara left town.",
      pov: "Mara Bell",
    },
    {
      title: "Road closure",
      summary: "The winter storm cuts off the last road and forces the family back together.",
      pov: "Mara Bell",
    },
    {
      title: "What June remembered",
      summary: "June tells a different version of the argument that divided the Bell family.",
      pov: "June Bell",
    },
    {
      title: "The porch light",
      summary: "Mara must decide whether returning home can mean more than simply staying.",
      pov: "Mara Bell",
    },
  ],
  "saltwater-static": [
    {
      title: "Dead air",
      summary: "Nora hears a familiar voice beneath the island weather report.",
      pov: "Nora Vale",
    },
    {
      title: "The old relay",
      summary: "A maintenance log connects the broadcast to a station abandoned decades ago.",
      pov: "Nora Vale",
    },
    {
      title: "Low tide",
      summary: "The tide exposes a cable running toward the cliffs below the lighthouse.",
      pov: "Eli March",
    },
    {
      title: "Signal drift",
      summary: "The transmission changes after Nora speaks her sister's name on air.",
      pov: "Nora Vale",
    },
    {
      title: "The lighthouse frequency",
      summary: "A repeating sequence points toward the night of the first disappearance.",
      pov: "Nora Vale",
    },
  ],
  "paper-moons": [
    {
      title: "Return to sender",
      summary: "June receives the first letter she wrote but never mailed.",
      pov: "June Hart",
    },
    {
      title: "Borrowed light",
      summary: "Theo and June revisit the observatory where their relationship began.",
      pov: "Theo Lane",
    },
    {
      title: "No postmark",
      summary: "A new letter predicts a conversation neither of them has had yet.",
      pov: "June Hart",
    },
    {
      title: "Ten years late",
      summary: "Theo finally explains why he stopped answering June's letters.",
      pov: "Theo Lane",
    },
    {
      title: "A moon made of paper",
      summary: "June chooses which version of their future she is willing to believe.",
      pov: "June Hart",
    },
  ],
  "wildlight-orchard": [
    {
      title: "The seven-year bloom",
      summary: "Lio prepares the orchard for the harvest that remembers every promise.",
      pov: "Lio Fen",
    },
    {
      title: "Fruit of remembrance",
      summary: "The first ripe fruit carries a memory no living keeper recognizes.",
      pov: "Lio Fen",
    },
    {
      title: "The keeper's ledger",
      summary: "A missing name in the orchard ledger points toward an old family bargain.",
      pov: "Sera Vale",
    },
    {
      title: "Roots beneath the wall",
      summary: "Lio follows an impossible memory into the oldest part of the orchard.",
      pov: "Lio Fen",
    },
    {
      title: "Harvest night",
      summary: "The rival heirs arrive as the orchard begins revealing what it witnessed.",
      pov: "Lio Fen",
    },
  ],
};

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function createInitialChapters({
  bookId,
  chapterCount,
  currentChapterTitle,
  currentExcerpt,
}: Pick<
  ChapterWorkspaceProps,
  "bookId" | "chapterCount" | "currentChapterTitle" | "currentExcerpt"
>): Chapter[] {
  const blueprints = chapterBlueprints[bookId] ?? chapterBlueprints["the-long-way-home"];

  return Array.from({ length: chapterCount }, (_, index) => {
    const number = index + 1;
    const blueprint = blueprints[index % blueprints.length];
    const isCurrent = number === chapterCount;
    const body = isCurrent
      ? currentExcerpt
      : blueprint.summary +
        "\n\nThis completed mock chapter is ready for review. Select it to update its metadata or manuscript text.";

    return {
      id: "chapter-" + number,
      number,
      title: isCurrent ? currentChapterTitle : blueprint.title,
      summary: blueprint.summary,
      status: isCurrent ? "Draft" : number === chapterCount - 1 ? "Revision" : "Complete",
      words: isCurrent ? countWords(body) : 1800 + ((number * 173) % 1400),
      pov: blueprint.pov,
      body,
      lastEdited: isCurrent
        ? "Today at 9:42 AM"
        : number === chapterCount - 1
          ? "Yesterday"
          : "May 18",
    };
  });
}

export function ChapterWorkspace(props: ChapterWorkspaceProps) {
  const {
    bookId,
    title: bookTitle,
    chapterCount,
    wordCount,
    targetWords,
    currentChapterTitle,
    currentExcerpt,
  } = props;
  const [chapters, setChapters] = useState(() =>
    createInitialChapters({ bookId, chapterCount, currentChapterTitle, currentExcerpt }),
  );
  const [selectedId, setSelectedId] = useState("chapter-" + chapterCount);
  const [draft, setDraft] = useState<Chapter>(() => chapters[chapters.length - 1]);
  const [query, setQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPov, setNewPov] = useState("");

  const navItems = [
    { label: "Overview", href: "/books/" + bookId },
    { label: "Chapters", href: "/books/" + bookId + "/chapters" },
    { label: "Characters", href: "/books/" + bookId + "/characters" },
    { label: "Plots", href: "/books/" + bookId + "/plots" },
    { label: "Notes", href: "/books/" + bookId + "/notes" },
  ];
  const selectedChapter = chapters.find((chapter) => chapter.id === selectedId);
  const hasUnsavedChanges = selectedChapter
    ? JSON.stringify(selectedChapter) !== JSON.stringify(draft)
    : false;
  const visibleChapters = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return chapters
      .filter(
        (chapter) =>
          !normalizedQuery ||
          chapter.title.toLowerCase().includes(normalizedQuery) ||
          chapter.pov.toLowerCase().includes(normalizedQuery) ||
          String(chapter.number).includes(normalizedQuery),
      )
      .slice()
      .reverse();
  }, [chapters, query]);
  const completedCount = chapters.filter((chapter) => chapter.status === "Complete").length;
  const manuscriptProgress = Math.min(100, Math.round((wordCount / targetWords) * 100));
  const averageWords = chapters.length ? Math.round(wordCount / chapters.length) : 0;

  function selectChapter(chapter: Chapter) {
    setSelectedId(chapter.id);
    setDraft(chapter);
  }

  function updateDraft<Key extends keyof Chapter>(field: Key, value: Chapter[Key]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function saveDraft() {
    const savedDraft = {
      ...draft,
      words: countWords(draft.body),
      lastEdited: "Just now",
    };
    setChapters((current) =>
      current.map((chapter) => (chapter.id === savedDraft.id ? savedDraft : chapter)),
    );
    setDraft(savedDraft);
  }

  function resetDraft() {
    if (selectedChapter) {
      setDraft(selectedChapter);
    }
  }

  function deleteChapter() {
    if (chapters.length <= 1) {
      return;
    }

    const remaining = chapters.filter((chapter) => chapter.id !== selectedId);
    const nextChapter = remaining[remaining.length - 1];
    setChapters(remaining);
    selectChapter(nextChapter);
  }

  function addChapter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = newTitle.trim();
    if (!cleanTitle) {
      return;
    }

    const number = chapters.reduce((highest, chapter) => Math.max(highest, chapter.number), 0) + 1;
    const createdChapter: Chapter = {
      id: "chapter-" + number + "-" + Date.now(),
      number,
      title: cleanTitle,
      summary: "",
      status: "Draft",
      words: 0,
      pov: newPov.trim() || "Unassigned",
      body: "",
      lastEdited: "Just now",
    };

    setChapters((current) => [...current, createdChapter]);
    selectChapter(createdChapter);
    setNewTitle("");
    setNewPov("");
    setQuery("");
    setIsAddOpen(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            href={"/books/" + bookId}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">{bookTitle}</span>
            <span className="sm:hidden">Book</span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <HardDrive aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">Saved on this device</span>
            <span className="sm:hidden">Local</span>
          </div>
        </div>
        <nav
          aria-label="Book sections"
          className="mx-auto max-w-[1500px] overflow-x-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="flex min-w-max gap-6">
            {navItems.map((item) => {
              const active = item.label === "Chapters";
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "border-b-2 px-0.5 py-3 text-sm font-bold transition",
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                  href={item.href}
                  key={item.label}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-extrabold tracking-[0.16em] text-primary uppercase">
              <BookOpenText aria-hidden="true" className="size-4" />
              Manuscript
            </div>
            <h1 className="font-heading text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Chapters
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Organize the manuscript, track chapter progress, and continue drafting in one place.
            </p>
          </div>

          <Dialog onOpenChange={setIsAddOpen} open={isAddOpen}>
            <DialogTrigger render={<Button className="h-10 rounded-xl px-4" />}>
              <Plus aria-hidden="true" />
              New chapter
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={addChapter}>
                <DialogHeader>
                  <DialogTitle className="text-xl">Add a chapter</DialogTitle>
                  <DialogDescription>
                    Start with a title and point of view. You can draft the chapter after adding it.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-6 grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="new-chapter-title">Chapter title</Label>
                    <Input
                      autoFocus
                      className="h-10 rounded-xl bg-muted/60"
                      id="new-chapter-title"
                      onChange={(event) => setNewTitle(event.target.value)}
                      placeholder="Untitled chapter"
                      required
                      value={newTitle}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-chapter-pov">Point of view</Label>
                    <Input
                      className="h-10 rounded-xl bg-muted/60"
                      id="new-chapter-pov"
                      onChange={(event) => setNewPov(event.target.value)}
                      placeholder="Character or narrator"
                      value={newPov}
                    />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <DialogClose render={<Button type="button" variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <Button type="submit">
                    <Plus aria-hidden="true" />
                    Add chapter
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </section>

        <section aria-label="Manuscript summary" className="mt-7 grid gap-4 sm:grid-cols-3">
          <Card className="gap-1 rounded-2xl bg-card py-5 ring-border">
            <CardContent>
              <p className="text-xs font-extrabold tracking-[0.12em] text-muted-foreground uppercase">
                Chapters
              </p>
              <p className="mt-2 font-heading text-2xl font-semibold">{chapters.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{completedCount} complete</p>
            </CardContent>
          </Card>
          <Card className="gap-1 rounded-2xl bg-card py-5 ring-border">
            <CardContent>
              <p className="text-xs font-extrabold tracking-[0.12em] text-muted-foreground uppercase">
                Total words
              </p>
              <p className="mt-2 font-heading text-2xl font-semibold">
                {wordCount.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {averageWords.toLocaleString()} average per chapter
              </p>
            </CardContent>
          </Card>
          <Card className="gap-3 rounded-2xl bg-card py-5 ring-border">
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-extrabold tracking-[0.12em] text-muted-foreground uppercase">
                  Draft progress
                </p>
                <span className="text-xs font-bold text-primary">{manuscriptProgress}%</span>
              </div>
              <Progress className="mt-3" value={manuscriptProgress} />
              <p className="mt-2 text-xs text-muted-foreground">
                {targetWords.toLocaleString()} word target
              </p>
            </CardContent>
          </Card>
        </section>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="gap-0 rounded-2xl bg-card py-0 ring-border lg:sticky lg:top-5">
            <div className="border-b border-border p-4">
              <h2 className="font-heading text-lg font-semibold">Chapter list</h2>
              <p className="mt-0.5 text-xs font-bold text-muted-foreground">
                Newest chapters first
              </p>
              <div className="relative mt-3">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <label className="sr-only" htmlFor="chapter-search">
                  Search chapters
                </label>
                <Input
                  className="h-10 rounded-xl bg-muted/60 pl-9"
                  id="chapter-search"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search chapters"
                  value={query}
                />
              </div>
            </div>
            <div className="max-h-[640px] overflow-y-auto p-2" role="list">
              {visibleChapters.length ? (
                visibleChapters.map((chapter) => {
                  const active = chapter.id === selectedId;
                  return (
                    <button
                      aria-pressed={active}
                      className={cn(
                        "w-full rounded-xl p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        active ? "bg-primary/10" : "hover:bg-muted/70",
                      )}
                      key={chapter.id}
                      onClick={() => selectChapter(chapter)}
                      role="listitem"
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">
                          Chapter {chapter.number}
                        </span>
                        <Badge
                          className={cn("border-0 text-[10px]", statusStyles[chapter.status])}
                          variant="secondary"
                        >
                          {chapter.status}
                        </Badge>
                      </div>
                      <p className="mt-1.5 line-clamp-1 font-heading text-base font-semibold">
                        {chapter.title}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{chapter.words.toLocaleString()} words</span>
                        <span>{chapter.lastEdited}</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-10 text-center">
                  <Search aria-hidden="true" className="mx-auto size-5 text-muted-foreground" />
                  <p className="mt-3 text-sm font-bold">No chapters found</p>
                  <p className="mt-1 text-xs text-muted-foreground">Try a title, number, or POV.</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="gap-0 rounded-2xl bg-card py-0 ring-border">
            <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-extrabold tracking-[0.14em] text-primary uppercase">
                    Chapter {draft.number}
                  </p>
                  <CardTitle className="mt-1 text-xl font-semibold">{draft.title}</CardTitle>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!hasUnsavedChanges}
                    onClick={resetDraft}
                    type="button"
                    variant="outline"
                  >
                    <RotateCcw aria-hidden="true" />
                    Reset
                  </Button>
                  <Button disabled={!hasUnsavedChanges} onClick={saveDraft} type="button">
                    <Save aria-hidden="true" />
                    Save changes
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="chapter-title">Chapter title</Label>
                  <Input
                    className="h-10 rounded-xl bg-muted/60"
                    id="chapter-title"
                    onChange={(event) => updateDraft("title", event.target.value)}
                    value={draft.title}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="chapter-pov">Point of view</Label>
                  <div className="relative">
                    <UserRound
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      className="h-10 rounded-xl bg-muted/60 pl-9"
                      id="chapter-pov"
                      onChange={(event) => updateDraft("pov", event.target.value)}
                      value={draft.pov}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:max-w-56">
                <Label htmlFor="chapter-status">Status</Label>
                <Select
                  onValueChange={(value) => value && updateDraft("status", value as ChapterStatus)}
                  value={draft.status}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl bg-muted/60" id="chapter-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chapterStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="chapter-summary">Chapter summary</Label>
                <Textarea
                  className="min-h-24 resize-y rounded-xl bg-muted/60"
                  id="chapter-summary"
                  onChange={(event) => updateDraft("summary", event.target.value)}
                  placeholder="What changes in this chapter?"
                  value={draft.summary}
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="chapter-manuscript">Manuscript</Label>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                    <FileText aria-hidden="true" className="size-3.5" />
                    {countWords(draft.body).toLocaleString()} words
                  </span>
                </div>
                <Textarea
                  className="min-h-[360px] resize-y rounded-xl bg-muted/40 px-4 py-4 font-serif text-base leading-8"
                  id="chapter-manuscript"
                  onChange={(event) => updateDraft("body", event.target.value)}
                  placeholder="Begin writing this chapter..."
                  value={draft.body}
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <CheckCircle2 aria-hidden="true" className="size-4 text-primary" />
                  {hasUnsavedChanges ? "Unsaved changes" : "All changes saved locally"}
                </div>
                <Button
                  disabled={chapters.length <= 1}
                  onClick={deleteChapter}
                  type="button"
                  variant="destructive"
                >
                  <Trash2 aria-hidden="true" />
                  Delete chapter
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
