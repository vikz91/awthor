"use client";

import {
  Archive,
  ArrowLeft,
  FileText,
  HardDrive,
  Lightbulb,
  MoreHorizontal,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
  getAwthorRepository,
  type Note,
  type NoteCategory,
  noteCategories,
} from "@/lib/repository";
import { useRepositoryCollection } from "@/lib/repository/use-repository-collection";

const categories = noteCategories;

type Filter = "All notes" | "Pinned" | "Archived" | NoteCategory;

const initialNotes: Note[] = [
  {
    id: "stillwater-winter",
    title: "Stillwater winter research",
    body: `The harbor usually begins icing at the edges in late December, but the main channel stays navigable through most of January. The old ferry terminal would smell like salt, diesel, and wet wool after a storm.\n\nDetails to verify:\n• How quickly sea smoke forms in sub-zero weather\n• Whether the bell buoy can be heard from Mae's house\n• Typical February sunrise time on the Maine coast`,
    category: "Research",
    relatedTo: "Setting · Stillwater harbor",
    updatedAt: "Today, 9:42 AM",
    pinned: true,
    archived: false,
  },
  {
    id: "station-scene",
    title: "Chapter 7 — station scene",
    body: `Eliza arrives early and pretends she is only there to return Samuel's notebook. She watches every passenger step off except him.\n\nLet the empty platform do the emotional work. No phone call yet. End the scene with the station lights clicking off one row at a time while she remains on the bench.`,
    category: "Scene idea",
    relatedTo: "Chapter 7 · The Last Train",
    updatedAt: "Yesterday, 6:18 PM",
    pinned: true,
    archived: false,
  },
  {
    id: "return-motif",
    title: "Eliza's return motif",
    body: `Use thresholds whenever Eliza has to choose between the person she was and the life in front of her: the station door, the gate at Mae's garden, the workshop entrance, and finally the harbor steps.\n\nThe repetition should become less noticeable as she begins to feel at home again.`,
    category: "Worldbuilding",
    relatedTo: "Character · Eliza Vale",
    updatedAt: "Aug 25, 2:06 PM",
    pinned: false,
    archived: false,
  },
  {
    id: "act-two-loose-ends",
    title: "Loose ends before act two",
    body: `• Place Gideon's missing ledger in the workshop\n• Give Nora a reason to visit Mae before the storm\n• Clarify why Samuel kept the ferry token\n• Seed the redevelopment vote one chapter earlier`,
    category: "To-do",
    relatedTo: "Outline · Act one",
    updatedAt: "Aug 24, 11:31 AM",
    pinned: false,
    archived: false,
  },
  {
    id: "maes-kitchen",
    title: "Mae's kitchen details",
    body: `Blue enamel kettle, chipped terracotta tiles, rosemary drying above the sink. The radio loses signal whenever the wind comes from the east. Mae keeps important letters inside an old flour tin marked 1987.`,
    category: "Worldbuilding",
    relatedTo: "Location · Mae's house",
    updatedAt: "Aug 22, 4:54 PM",
    pinned: false,
    archived: false,
  },
  {
    id: "original-ending",
    title: "Original ending variation",
    body: `Earlier version: Eliza leaves the town after exposing Gideon. Keep this for reference, but the current ending should let her stay by choice rather than obligation.`,
    category: "Scene idea",
    relatedTo: "Outline · Ending",
    updatedAt: "Aug 18, 10:12 AM",
    pinned: false,
    archived: true,
  },
];

const filters: Filter[] = ["All notes", "Pinned", ...categories, "Archived"];

const categoryStyles: Record<NoteCategory, string> = {
  Research: "bg-chart-3/15 text-chart-3",
  "Scene idea": "bg-chart-2/15 text-chart-2",
  Worldbuilding: "bg-primary/10 text-primary",
  "To-do": "bg-chart-4/15 text-chart-4",
};

const repository = getAwthorRepository();

function getExcerpt(body: string) {
  return body.replaceAll("\n", " ").replaceAll("•", "").trim();
}

function countWords(value: string) {
  const normalized = value.trim();
  return normalized ? normalized.split(/\s+/).length : 0;
}

export function NotesWorkspace({ bookId, bookTitle }: { bookId: string; bookTitle: string }) {
  const navItems = [
    { label: "Overview", href: `/books/${bookId}` },
    { label: "Chapters", href: `/books/${bookId}/chapters` },
    { label: "Characters", href: `/books/${bookId}/characters` },
    { label: "Plots", href: `/books/${bookId}/plots` },
    { label: "Notes", href: `/books/${bookId}/notes` },
  ];
  const [notes, setNotes, repositoryState] = useRepositoryCollection(
    repository.notes,
    bookId,
    initialNotes,
  );
  const [selectedId, setSelectedId] = useState(initialNotes[0].id);
  const [draft, setDraft] = useState(initialNotes[0]);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("All notes");
  const hydratedBookId = useRef<string | null>(null);

  useEffect(() => {
    if (!repositoryState.isReady || hydratedBookId.current === bookId) {
      return;
    }

    const selected = notes.find((note) => note.id === selectedId) ?? notes[0];
    if (selected) {
      setSelectedId(selected.id);
      setDraft(selected);
    }
    hydratedBookId.current = bookId;
  }, [bookId, notes, repositoryState.isReady, selectedId]);

  const selectedNote = notes.find((note) => note.id === selectedId);
  const hasUnsavedChanges = selectedNote
    ? JSON.stringify(selectedNote) !== JSON.stringify(draft)
    : false;

  const visibleNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return notes
      .filter((note) => {
        const matchesFilter =
          activeFilter === "Archived"
            ? note.archived
            : !note.archived &&
              (activeFilter === "All notes" ||
                (activeFilter === "Pinned" && note.pinned) ||
                note.category === activeFilter);
        const matchesQuery =
          !normalizedQuery ||
          note.title.toLowerCase().includes(normalizedQuery) ||
          note.body.toLowerCase().includes(normalizedQuery) ||
          note.relatedTo.toLowerCase().includes(normalizedQuery);

        return matchesFilter && matchesQuery;
      })
      .sort((first, second) => Number(second.pinned) - Number(first.pinned));
  }, [activeFilter, notes, query]);

  function selectNote(note: Note) {
    setSelectedId(note.id);
    setDraft(note);
  }

  function setDraftField<Key extends keyof Note>(field: Key, value: Note[Key]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function saveDraft() {
    const savedDraft = { ...draft, updatedAt: "Just now" };
    setNotes((current) => current.map((note) => (note.id === savedDraft.id ? savedDraft : note)));
    setDraft(savedDraft);
  }

  function resetDraft() {
    if (selectedNote) {
      setDraft(selectedNote);
    }
  }

  function createNote() {
    const createdNote: Note = {
      id: `note-${Date.now()}`,
      title: "Untitled note",
      body: "",
      category: "Scene idea",
      relatedTo: "Unlinked",
      updatedAt: "Just now",
      pinned: false,
      archived: false,
    };

    setNotes((current) => [createdNote, ...current]);
    setActiveFilter("All notes");
    selectNote(createdNote);
  }

  function togglePinned() {
    const updatedDraft = { ...draft, pinned: !draft.pinned, updatedAt: "Just now" };
    setNotes((current) =>
      current.map((note) => (note.id === updatedDraft.id ? updatedDraft : note)),
    );
    setDraft(updatedDraft);
  }

  function archiveNote() {
    const nextArchived = !draft.archived;
    const updatedNotes = notes.map((note) =>
      note.id === draft.id ? { ...draft, archived: nextArchived, updatedAt: "Just now" } : note,
    );
    setNotes(updatedNotes);

    const nextNote = updatedNotes.find((note) =>
      activeFilter === "Archived" ? note.archived : !note.archived,
    );
    if (nextNote) {
      selectNote(nextNote);
    } else {
      setSelectedId("");
    }
  }

  function deleteNote() {
    const remaining = notes.filter((note) => note.id !== draft.id);
    setNotes(remaining);

    const nextNote = remaining.find((note) =>
      activeFilter === "Archived" ? note.archived : !note.archived,
    );
    if (nextNote) {
      selectNote(nextNote);
    } else {
      setSelectedId("");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-foreground"
            href={`/books/${bookId}`}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">{bookTitle}</span>
            <span className="sm:hidden">Book</span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <HardDrive aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">
              {repositoryState.error ? "Local save unavailable" : "Saved on this device"}
            </span>
            <span className="sm:hidden">{repositoryState.error ? "Save error" : "Local"}</span>
          </div>
        </div>
        <nav
          aria-label="Book sections"
          className="mx-auto max-w-[1500px] overflow-x-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="flex min-w-max gap-6">
            {navItems.map((item) => {
              const active = item.label === "Notes";
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`border-b-2 px-0.5 py-3 text-sm font-bold transition ${
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
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
            <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
              <Lightbulb aria-hidden="true" className="size-4" />
              Story notebook
            </div>
            <h1 className="font-heading text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Notes
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Keep research, scene fragments, and loose story threads close to your manuscript.
            </p>
          </div>
          <Button className="h-10 rounded-xl px-4" onClick={createNote}>
            <Plus aria-hidden="true" />
            New note
          </Button>
        </section>

        <div className="mt-7 grid items-start gap-5 lg:grid-cols-[350px_minmax(0,1fr)]">
          <Card className="gap-0 rounded-2xl bg-card py-0 ring-border lg:sticky lg:top-5">
            <div className="border-b border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold">Notebook</h2>
                  <p className="mt-0.5 text-xs font-bold text-muted-foreground">
                    {notes.filter((note) => !note.archived).length} active ·{" "}
                    {notes.filter((note) => note.pinned && !note.archived).length} pinned
                  </p>
                </div>
                <FileText aria-hidden="true" className="size-5 text-muted-foreground" />
              </div>
              <div className="relative mt-3">
                <Search
                  aria-hidden="true"
                  className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Label className="sr-only" htmlFor="note-search">
                  Search notes
                </Label>
                <Input
                  className="h-10 rounded-xl bg-muted/60 pr-3 pl-9"
                  id="note-search"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search notes"
                  type="search"
                  value={query}
                />
              </div>
              <fieldset className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                <legend className="sr-only">Filter notes</legend>
                {filters.map((filter) => {
                  const active = filter === activeFilter;
                  return (
                    <Button
                      aria-pressed={active}
                      className={`rounded-lg px-2.5 ${
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      }`}
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      size="xs"
                      variant="ghost"
                    >
                      {filter}
                    </Button>
                  );
                })}
              </fieldset>
            </div>

            <CardContent className="max-h-[590px] overflow-y-auto p-2">
              {visibleNotes.length > 0 ? (
                <ul className="space-y-1">
                  {visibleNotes.map((note) => {
                    const active = note.id === selectedId;
                    return (
                      <li key={note.id}>
                        <button
                          className={`w-full rounded-xl px-3 py-3 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            active ? "bg-primary/10" : "hover:bg-muted/60"
                          }`}
                          onClick={() => selectNote(note)}
                          type="button"
                        >
                          <span className="flex items-start justify-between gap-3">
                            <span className="line-clamp-1 text-sm font-extrabold">
                              {note.title}
                            </span>
                            {note.pinned && (
                              <Pin
                                aria-label="Pinned"
                                className="mt-0.5 size-3.5 shrink-0 fill-primary text-primary"
                              />
                            )}
                          </span>
                          <span className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {getExcerpt(note.body) || "Start writing this note…"}
                          </span>
                          <span className="mt-2.5 flex items-center justify-between gap-2">
                            <Badge className={categoryStyles[note.category]} variant="secondary">
                              {note.category}
                            </Badge>
                            <span className="text-[11px] font-bold text-muted-foreground">
                              {note.updatedAt}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="px-5 py-14 text-center">
                  <FileText aria-hidden="true" className="mx-auto size-7 text-muted-foreground" />
                  <p className="mt-3 text-sm font-bold">No notes found</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Try another search or create a new note.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedNote ? (
            <Card className="gap-0 rounded-2xl bg-card py-0 ring-border">
              <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-7">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={categoryStyles[draft.category]} variant="secondary">
                      {draft.category}
                    </Badge>
                    {draft.pinned && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                        <Pin aria-hidden="true" className="size-3.5 fill-current" /> Pinned
                      </span>
                    )}
                    {draft.archived && (
                      <Badge variant="outline">
                        <Archive aria-hidden="true" /> Archived
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs font-bold text-muted-foreground">
                    Updated {draft.updatedAt}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {hasUnsavedChanges && (
                    <span className="mr-1 text-xs font-bold text-chart-2">Unsaved</span>
                  )}
                  <Button
                    disabled={!hasUnsavedChanges}
                    onClick={resetDraft}
                    size="icon"
                    variant="ghost"
                  >
                    <RotateCcw aria-hidden="true" />
                    <span className="sr-only">Discard changes</span>
                  </Button>
                  <Button
                    className="h-9 rounded-xl"
                    disabled={!hasUnsavedChanges}
                    onClick={saveDraft}
                  >
                    <Save aria-hidden="true" />
                    Save note
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button aria-label="Note actions" size="icon" variant="ghost" />}
                    >
                      <MoreHorizontal aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={togglePinned}>
                        {draft.pinned ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
                        {draft.pinned ? "Unpin note" : "Pin note"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={archiveNote}>
                        <Archive aria-hidden="true" />
                        {draft.archived ? "Restore note" : "Archive note"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={deleteNote} variant="destructive">
                        <Trash2 aria-hidden="true" />
                        Delete note
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <CardContent className="space-y-5 px-5 py-6 lg:px-7 lg:py-7">
                <div>
                  <Label className="sr-only" htmlFor="note-title">
                    Note title
                  </Label>
                  <Input
                    className="h-auto rounded-none border-0 bg-transparent px-0 py-0 font-heading text-2xl font-semibold tracking-[-0.025em] shadow-none focus-visible:border-transparent focus-visible:ring-0 sm:text-3xl md:text-3xl"
                    id="note-title"
                    onChange={(event) => setDraftField("title", event.target.value)}
                    placeholder="Untitled note"
                    value={draft.title}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-[190px_minmax(0,1fr)]">
                  <div>
                    <Label
                      className="mb-1.5 block text-xs font-bold text-muted-foreground"
                      htmlFor="note-category"
                    >
                      Category
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        value && setDraftField("category", value as NoteCategory)
                      }
                      value={draft.category}
                    >
                      <SelectTrigger
                        className="h-10 w-full rounded-xl bg-muted/60"
                        id="note-category"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      className="mb-1.5 block text-xs font-bold text-muted-foreground"
                      htmlFor="note-related-to"
                    >
                      Related to
                    </Label>
                    <Input
                      className="h-10 rounded-xl bg-muted/60"
                      id="note-related-to"
                      onChange={(event) => setDraftField("relatedTo", event.target.value)}
                      placeholder="Chapter, character, location…"
                      value={draft.relatedTo}
                    />
                  </div>
                </div>

                <div>
                  <Label className="sr-only" htmlFor="note-body">
                    Note content
                  </Label>
                  <Textarea
                    className="min-h-[420px] resize-y rounded-2xl bg-muted/60 p-4 text-[15px] leading-7 sm:min-h-[500px]"
                    id="note-body"
                    onChange={(event) => setDraftField("body", event.target.value)}
                    placeholder="Start writing…"
                    value={draft.body}
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-muted-foreground">
                    <span>{draft.relatedTo || "Unlinked note"}</span>
                    <span>
                      {countWords(draft.body)} words · {draft.body.length} characters
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="items-center justify-center rounded-2xl bg-card py-24 text-center ring-border">
              <FileText aria-hidden="true" className="size-9 text-muted-foreground" />
              <div>
                <h2 className="font-heading text-xl font-semibold">No note selected</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a note from the notebook or create a new one.
                </p>
              </div>
              <Button className="rounded-xl" onClick={createNote} variant="outline">
                <Plus aria-hidden="true" />
                New note
              </Button>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
