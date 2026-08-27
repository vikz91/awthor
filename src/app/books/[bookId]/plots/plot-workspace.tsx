"use client";

import {
  ArrowLeft,
  Check,
  Circle,
  GitBranch,
  HardDrive,
  ListFilter,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Target,
  UsersRound,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  getAwthorRepository,
  type PlotStatus,
  type PlotThread,
  type PlotType,
  plotStatuses,
  plotTypes,
  type Tension,
  tensionLevels,
} from "@/lib/repository";
import { useRepositoryCollection } from "@/lib/repository/use-repository-collection";

type NewPlot = Pick<PlotThread, "title" | "type" | "status" | "summary">;

const initialPlots: PlotThread[] = [
  {
    id: "vale-estate-truth",
    title: "The truth behind the Vale estate",
    type: "Main plot",
    status: "In progress",
    tension: "High",
    summary:
      "Eliza returns to Bellwether to sell the house and discovers that her father's final deed was altered. Following the paper trail pulls her into a buried town bargain.",
    stakes:
      "If Eliza cannot prove what happened, Gideon will take the waterfront property and Mae may lose the studio that has kept the family afloat.",
    characters: ["Eliza Vale", "Mae Bell", "Gideon Price", "Samuel Reed"],
    startChapter: 1,
    endChapter: 12,
    beats: [
      { id: "estate-1", title: "Eliza finds the unsigned deed", chapter: 2, complete: true },
      { id: "estate-2", title: "Mae admits the survey was changed", chapter: 5, complete: true },
      {
        id: "estate-3",
        title: "Gideon offers Eliza a private settlement",
        chapter: 8,
        complete: false,
      },
      {
        id: "estate-4",
        title: "The original map surfaces at the harbor",
        chapter: 10,
        complete: false,
      },
      {
        id: "estate-5",
        title: "Eliza tells the town what her father did",
        chapter: 12,
        complete: false,
      },
    ],
  },
  {
    id: "eliza-samuel-trust",
    title: "Eliza and Samuel rebuild trust",
    type: "Subplot",
    status: "In progress",
    tension: "Rising",
    summary:
      "Old affection resurfaces as Eliza and Samuel work together, but neither can move forward until they name the betrayal that ended their friendship.",
    stakes:
      "Eliza risks repeating the same retreat that drove her away, while Samuel must choose between protecting himself and asking her to stay.",
    characters: ["Eliza Vale", "Samuel Reed", "Nora Reed"],
    startChapter: 2,
    endChapter: 12,
    beats: [
      { id: "trust-1", title: "A tense reunion at Reed Boatworks", chapter: 2, complete: true },
      { id: "trust-2", title: "They repair the storm-damaged skiff", chapter: 6, complete: false },
      {
        id: "trust-3",
        title: "Samuel reveals the letter he never sent",
        chapter: 9,
        complete: false,
      },
      { id: "trust-4", title: "Eliza chooses an honest goodbye", chapter: 12, complete: false },
    ],
  },
  {
    id: "harbor-redevelopment",
    title: "The harbor redevelopment",
    type: "Mystery thread",
    status: "Planned",
    tension: "Rising",
    summary:
      "Nora traces Gideon's redevelopment proposal through shell companies and learns why he needs the Vale property before the winter council vote.",
    stakes:
      "The working harbor could be replaced by private slips, displacing the families whose testimony Eliza needs.",
    characters: ["Nora Reed", "Gideon Price", "Samuel Reed"],
    startChapter: 4,
    endChapter: 11,
    beats: [
      {
        id: "harbor-1",
        title: "Nora notices duplicate company addresses",
        chapter: 4,
        complete: true,
      },
      { id: "harbor-2", title: "The council agenda quietly changes", chapter: 7, complete: false },
      {
        id: "harbor-3",
        title: "Boatbuilders organize before the vote",
        chapter: 11,
        complete: false,
      },
    ],
  },
  {
    id: "eliza-chooses-home",
    title: "Eliza chooses what home means",
    type: "Character arc",
    status: "In progress",
    tension: "Quiet",
    summary:
      "Eliza arrives treating Bellwether as a problem to finish. Each new truth forces her to separate the place itself from the grief she attached to it.",
    stakes:
      "Without a new definition of home, even winning the estate will leave Eliza repeating the life of distance she came back to end.",
    characters: ["Eliza Vale", "Mae Bell", "Samuel Reed"],
    startChapter: 1,
    endChapter: 12,
    beats: [
      { id: "home-1", title: "Eliza sleeps in her childhood room", chapter: 1, complete: true },
      {
        id: "home-2",
        title: "She restores her mother's garden bench",
        chapter: 6,
        complete: false,
      },
      { id: "home-3", title: "She changes her return ticket", chapter: 9, complete: false },
      { id: "home-4", title: "Eliza takes the house off the market", chapter: 12, complete: false },
    ],
  },
  {
    id: "mae-kept-secret",
    title: "Mae's carefully kept secret",
    type: "Subplot",
    status: "Resolved",
    tension: "Climax",
    summary:
      "Mae has spent years hiding her part in the waterfront agreement, believing silence protected Eliza from the choices her father made.",
    stakes:
      "Telling the truth could cost Mae both Eliza's trust and the town's affection, but silence leaves Gideon's version uncontested.",
    characters: ["Mae Bell", "Eliza Vale", "Gideon Price"],
    startChapter: 3,
    endChapter: 10,
    beats: [
      {
        id: "secret-1",
        title: "Mae deflects questions about the deed",
        chapter: 3,
        complete: true,
      },
      { id: "secret-2", title: "Eliza finds Mae's name in the ledger", chapter: 7, complete: true },
      {
        id: "secret-3",
        title: "Mae gives Eliza the missing affidavit",
        chapter: 10,
        complete: true,
      },
    ],
  },
];

const emptyNewPlot: NewPlot = {
  title: "",
  type: "Subplot",
  status: "Planned",
  summary: "",
};

const repository = getAwthorRepository();

const statusStyles: Record<PlotStatus, string> = {
  Planned: "border-border bg-muted text-muted-foreground",
  "In progress": "border-primary/20 bg-primary/10 text-primary",
  Resolved: "border-chart-3/20 bg-chart-3/15 text-chart-3",
};

const tensionStyles: Record<Tension, string> = {
  Quiet: "bg-muted text-muted-foreground",
  Rising: "bg-chart-5/15 text-chart-5",
  High: "bg-chart-2/15 text-chart-2",
  Climax: "bg-destructive/10 text-destructive",
};

function getPlotProgress(plot: PlotThread) {
  if (plot.beats.length === 0) {
    return 0;
  }

  return Math.round((plot.beats.filter((beat) => beat.complete).length / plot.beats.length) * 100);
}

function Field({
  children,
  className = "",
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 text-xs font-extrabold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function PlotWorkspace({ bookId, bookTitle }: { bookId: string; bookTitle: string }) {
  const [plots, setPlots, repositoryState] = useRepositoryCollection(
    repository.plots,
    bookId,
    initialPlots,
  );
  const [selectedId, setSelectedId] = useState(initialPlots[0].id);
  const [draft, setDraft] = useState(initialPlots[0]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlotStatus | "All">("All");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPlot, setNewPlot] = useState(emptyNewPlot);
  const hydratedBookId = useRef<string | null>(null);

  useEffect(() => {
    if (!repositoryState.isReady || hydratedBookId.current === bookId) {
      return;
    }

    const selected = plots.find((plot) => plot.id === selectedId) ?? plots[0];
    if (selected) {
      setSelectedId(selected.id);
      setDraft(selected);
    }
    hydratedBookId.current = bookId;
  }, [bookId, plots, repositoryState.isReady, selectedId]);

  const navItems = [
    { label: "Overview", href: `/books/${bookId}` },
    { label: "Chapters", href: `/books/${bookId}/chapters` },
    { label: "Characters", href: `/books/${bookId}/characters` },
    { label: "Plots", href: `/books/${bookId}/plots` },
    { label: "Notes", href: `/books/${bookId}/notes` },
  ];

  const filteredPlots = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return plots.filter((plot) => {
      const matchesStatus = statusFilter === "All" || plot.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        plot.title.toLowerCase().includes(normalizedQuery) ||
        plot.type.toLowerCase().includes(normalizedQuery) ||
        plot.characters.some((character) => character.toLowerCase().includes(normalizedQuery));

      return matchesStatus && matchesQuery;
    });
  }, [plots, query, statusFilter]);

  const selectedPlot = plots.find((plot) => plot.id === selectedId);
  const hasUnsavedChanges = selectedPlot
    ? JSON.stringify(selectedPlot) !== JSON.stringify(draft)
    : false;
  const completedBeats = draft.beats.filter((beat) => beat.complete).length;
  const totalBeats = plots.reduce((total, plot) => total + plot.beats.length, 0);
  const resolvedPlots = plots.filter((plot) => plot.status === "Resolved").length;

  function selectPlot(plot: PlotThread) {
    setSelectedId(plot.id);
    setDraft(plot);
  }

  function setDraftField<Key extends keyof PlotThread>(field: Key, value: PlotThread[Key]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function saveDraft() {
    setPlots((current) => current.map((plot) => (plot.id === draft.id ? draft : plot)));
  }

  function resetDraft() {
    if (selectedPlot) {
      setDraft(selectedPlot);
    }
  }

  function toggleBeat(beatId: string) {
    setDraftField(
      "beats",
      draft.beats.map((beat) =>
        beat.id === beatId ? { ...beat, complete: !beat.complete } : beat,
      ),
    );
  }

  function addBeat() {
    const lastChapter = draft.beats.at(-1)?.chapter ?? draft.startChapter;
    setDraftField("beats", [
      ...draft.beats,
      {
        id: `beat-${Date.now()}`,
        title: "Untitled story beat",
        chapter: Math.min(lastChapter + 1, draft.endChapter),
        complete: false,
      },
    ]);
  }

  function addPlot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = newPlot.title.trim();

    if (!cleanTitle) {
      return;
    }

    const createdPlot: PlotThread = {
      ...newPlot,
      id: `${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      title: cleanTitle,
      tension: "Quiet",
      stakes: "Define what is at risk if this plot thread fails.",
      characters: [],
      startChapter: 1,
      endChapter: 12,
      beats: [],
    };

    setPlots((current) => [...current, createdPlot]);
    selectPlot(createdPlot);
    setNewPlot(emptyNewPlot);
    setStatusFilter("All");
    setQuery("");
    setIsAddOpen(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            className="inline-flex items-center gap-2 rounded-md text-sm font-bold text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
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
              const active = item.label === "Plots";
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
              <Waypoints aria-hidden="true" className="size-4" />
              Story map
            </div>
            <h1 className="font-heading text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Plots
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Track story threads, turning points, and stakes across the manuscript.
            </p>
          </div>

          <Dialog onOpenChange={setIsAddOpen} open={isAddOpen}>
            <DialogTrigger render={<Button className="h-10 rounded-xl px-4" />}>
              <Plus aria-hidden="true" />
              New plot thread
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <form onSubmit={addPlot}>
                <DialogHeader>
                  <DialogTitle className="text-xl">Add a plot thread</DialogTitle>
                  <DialogDescription>
                    Capture the thread now, then add its stakes, characters, and beats in the
                    workspace.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field className="sm:col-span-2" label="Thread title">
                    <Input
                      autoFocus
                      className="h-10 rounded-xl bg-muted/60"
                      id="new-plot-title"
                      onChange={(event) =>
                        setNewPlot((current) => ({ ...current, title: event.target.value }))
                      }
                      placeholder="What changes in this thread?"
                      required
                      value={newPlot.title}
                    />
                  </Field>
                  <Field label="Type">
                    <Select
                      onValueChange={(value) =>
                        value && setNewPlot((current) => ({ ...current, type: value as PlotType }))
                      }
                      value={newPlot.type}
                    >
                      <SelectTrigger className="h-10 w-full rounded-xl bg-muted/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {plotTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Status">
                    <Select
                      onValueChange={(value) =>
                        value &&
                        setNewPlot((current) => ({ ...current, status: value as PlotStatus }))
                      }
                      value={newPlot.status}
                    >
                      <SelectTrigger className="h-10 w-full rounded-xl bg-muted/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {plotStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field className="sm:col-span-2" label="Summary">
                    <Textarea
                      className="min-h-28 rounded-xl bg-muted/60 leading-6"
                      id="new-plot-summary"
                      onChange={(event) =>
                        setNewPlot((current) => ({ ...current, summary: event.target.value }))
                      }
                      placeholder="A short description of the thread..."
                      value={newPlot.summary}
                    />
                  </Field>
                </div>

                <DialogFooter className="mt-6">
                  <DialogClose render={<Button type="button" variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <Button type="submit">
                    <Plus aria-hidden="true" />
                    Add plot
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </section>

        <section aria-label="Plot overview" className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatCard icon={GitBranch} label="Plot threads" value={String(plots.length)} />
          <StatCard icon={Sparkles} label="Story beats" value={String(totalBeats)} />
          <StatCard
            icon={Check}
            label="Resolved threads"
            value={`${resolvedPlots} of ${plots.length}`}
          />
        </section>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <Card className="gap-0 rounded-2xl bg-card py-0 ring-border lg:sticky lg:top-5">
            <div className="border-b border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold">Threads</h2>
                  <p className="mt-0.5 text-xs font-bold text-muted-foreground">
                    {filteredPlots.length} of {plots.length} shown
                  </p>
                </div>
                <ListFilter aria-hidden="true" className="size-4 text-muted-foreground" />
              </div>
              <div className="relative mt-3">
                <Search
                  aria-hidden="true"
                  className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Label className="sr-only" htmlFor="plot-search">
                  Search plot threads
                </Label>
                <Input
                  className="h-10 rounded-xl bg-muted/60 pr-3 pl-9"
                  id="plot-search"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search threads or cast"
                  type="search"
                  value={query}
                />
              </div>
              <Select
                onValueChange={(value) => value && setStatusFilter(value as PlotStatus | "All")}
                value={statusFilter}
              >
                <SelectTrigger
                  aria-label="Filter plot threads by status"
                  className="mt-2 h-9 w-full rounded-xl bg-muted/60"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All statuses</SelectItem>
                  {plotStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <CardContent className="max-h-[610px] overflow-y-auto p-2">
              {filteredPlots.length > 0 ? (
                <ul className="space-y-1">
                  {filteredPlots.map((plot) => {
                    const active = plot.id === selectedId;
                    const progress = getPlotProgress(plot);
                    return (
                      <li key={plot.id}>
                        <button
                          className={`w-full rounded-xl px-3 py-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                            active ? "bg-primary/10" : "hover:bg-muted/60"
                          }`}
                          onClick={() => selectPlot(plot)}
                          type="button"
                        >
                          <span className="flex items-start justify-between gap-3">
                            <span className="min-w-0">
                              <span className="block text-sm font-extrabold leading-5">
                                {plot.title}
                              </span>
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {plot.type}
                              </span>
                            </span>
                            <Badge
                              className={`shrink-0 border px-2 py-0.5 text-[10px] ${statusStyles[plot.status]}`}
                              variant="outline"
                            >
                              {plot.status}
                            </Badge>
                          </span>
                          <span className="mt-3 flex items-center gap-2">
                            <Progress
                              className="flex-1 [&_[data-slot=progress-indicator]]:bg-primary [&_[data-slot=progress-track]]:h-1.5"
                              value={progress}
                            />
                            <span className="w-8 text-right text-[11px] font-bold tabular-nums text-muted-foreground">
                              {progress}%
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="px-4 py-12 text-center">
                  <Waypoints aria-hidden="true" className="mx-auto size-7 text-muted-foreground" />
                  <p className="mt-3 text-sm font-bold">No plot threads found</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Clear the search or choose another status.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedPlot ? (
            <Card className="rounded-2xl bg-card ring-border">
              <div className="flex flex-col gap-5 border-b border-border px-5 pb-5 sm:flex-row sm:items-start sm:justify-between lg:px-7">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className="border-primary/20 bg-primary/10 text-primary"
                      variant="outline"
                    >
                      {draft.type}
                    </Badge>
                    <Badge className={`border ${statusStyles[draft.status]}`} variant="outline">
                      {draft.status}
                    </Badge>
                    <Badge className={tensionStyles[draft.tension]} variant="secondary">
                      {draft.tension} tension
                    </Badge>
                  </div>
                  <h2 className="mt-3 font-heading text-2xl leading-tight font-semibold tracking-[-0.025em] sm:text-3xl">
                    {draft.title}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Chapters {draft.startChapter}–{draft.endChapter} · {completedBeats} of{" "}
                    {draft.beats.length} beats complete
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {hasUnsavedChanges && (
                    <span className="text-xs font-bold text-chart-2">Unsaved</span>
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
                    Save changes
                  </Button>
                </div>
              </div>

              <CardContent className="space-y-8 px-5 lg:px-7">
                <section aria-labelledby="plot-foundation-heading">
                  <SectionHeading
                    icon={Target}
                    id="plot-foundation-heading"
                    title="Plot foundation"
                  />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field className="sm:col-span-2" label="Thread title">
                      <Input
                        className="h-10 rounded-xl bg-muted/60"
                        id="plot-title"
                        onChange={(event) => setDraftField("title", event.target.value)}
                        value={draft.title}
                      />
                    </Field>
                    <Field label="Type">
                      <Select
                        onValueChange={(value) => value && setDraftField("type", value as PlotType)}
                        value={draft.type}
                      >
                        <SelectTrigger className="h-10 w-full rounded-xl bg-muted/60">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {plotTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Status">
                      <Select
                        onValueChange={(value) =>
                          value && setDraftField("status", value as PlotStatus)
                        }
                        value={draft.status}
                      >
                        <SelectTrigger className="h-10 w-full rounded-xl bg-muted/60">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {plotStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Tension">
                      <Select
                        onValueChange={(value) =>
                          value && setDraftField("tension", value as Tension)
                        }
                        value={draft.tension}
                      >
                        <SelectTrigger className="h-10 w-full rounded-xl bg-muted/60">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tensionLevels.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Starts in chapter">
                        <Input
                          className="h-10 rounded-xl bg-muted/60"
                          min="1"
                          onChange={(event) =>
                            setDraftField("startChapter", Number(event.target.value))
                          }
                          type="number"
                          value={draft.startChapter}
                        />
                      </Field>
                      <Field label="Ends in chapter">
                        <Input
                          className="h-10 rounded-xl bg-muted/60"
                          min="1"
                          onChange={(event) =>
                            setDraftField("endChapter", Number(event.target.value))
                          }
                          type="number"
                          value={draft.endChapter}
                        />
                      </Field>
                    </div>
                    <Field className="sm:col-span-2" label="Summary">
                      <Textarea
                        className="min-h-28 rounded-xl bg-muted/60 leading-6"
                        id="plot-summary"
                        onChange={(event) => setDraftField("summary", event.target.value)}
                        value={draft.summary}
                      />
                    </Field>
                    <Field className="sm:col-span-2" label="What is at stake?">
                      <Textarea
                        className="min-h-28 rounded-xl bg-muted/60 leading-6"
                        id="plot-stakes"
                        onChange={(event) => setDraftField("stakes", event.target.value)}
                        value={draft.stakes}
                      />
                    </Field>
                    <Field className="sm:col-span-2" label="Linked characters">
                      <Input
                        className="h-10 rounded-xl bg-muted/60"
                        id="plot-characters"
                        onChange={(event) =>
                          setDraftField(
                            "characters",
                            event.target.value
                              .split(",")
                              .map((character) => character.trim())
                              .filter(Boolean),
                          )
                        }
                        placeholder="Eliza Vale, Samuel Reed..."
                        value={draft.characters.join(", ")}
                      />
                      {draft.characters.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {draft.characters.map((character) => (
                            <Badge
                              className="gap-1 border-border bg-background/70 text-muted-foreground"
                              key={character}
                              variant="outline"
                            >
                              <UsersRound aria-hidden="true" />
                              {character}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Field>
                  </div>
                </section>

                <section aria-labelledby="story-beats-heading">
                  <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
                    <div>
                      <SectionHeading
                        icon={GitBranch}
                        id="story-beats-heading"
                        title="Story beats"
                      />
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Toggle beats as the corresponding chapter is drafted.
                      </p>
                    </div>
                    <Button onClick={addBeat} size="sm" variant="outline">
                      <Plus aria-hidden="true" />
                      Add beat
                    </Button>
                  </div>

                  {draft.beats.length > 0 ? (
                    <ol className="mt-4 space-y-2">
                      {draft.beats.map((beat, index) => (
                        <li className="relative flex gap-3" key={beat.id}>
                          {index < draft.beats.length - 1 && (
                            <span
                              aria-hidden="true"
                              className="absolute top-8 bottom-[-0.75rem] left-[0.9375rem] w-px bg-border"
                            />
                          )}
                          <button
                            aria-label={`${beat.complete ? "Mark incomplete" : "Mark complete"}: ${beat.title}`}
                            aria-pressed={beat.complete}
                            className={`relative z-10 mt-2 flex size-8 shrink-0 items-center justify-center rounded-full border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                              beat.complete
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-muted-foreground hover:border-primary"
                            }`}
                            onClick={() => toggleBeat(beat.id)}
                            type="button"
                          >
                            {beat.complete ? (
                              <Check aria-hidden="true" className="size-4" />
                            ) : (
                              <Circle aria-hidden="true" className="size-3" />
                            )}
                          </button>
                          <div className="grid min-w-0 flex-1 gap-2 rounded-xl border border-border bg-background/70 p-3 sm:grid-cols-[minmax(0,1fr)_7.5rem]">
                            <div>
                              <Label className="sr-only" htmlFor={`beat-title-${beat.id}`}>
                                Beat title
                              </Label>
                              <Input
                                className={`h-9 rounded-lg bg-transparent px-2 font-bold ${
                                  beat.complete ? "text-muted-foreground line-through" : ""
                                }`}
                                id={`beat-title-${beat.id}`}
                                onChange={(event) =>
                                  setDraftField(
                                    "beats",
                                    draft.beats.map((item) =>
                                      item.id === beat.id
                                        ? { ...item, title: event.target.value }
                                        : item,
                                    ),
                                  )
                                }
                                value={beat.title}
                              />
                            </div>
                            <div>
                              <Label className="sr-only" htmlFor={`beat-chapter-${beat.id}`}>
                                Chapter
                              </Label>
                              <div className="relative">
                                <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                                  Ch.
                                </span>
                                <Input
                                  className="h-9 rounded-lg bg-transparent pl-9 tabular-nums"
                                  id={`beat-chapter-${beat.id}`}
                                  min="1"
                                  onChange={(event) =>
                                    setDraftField(
                                      "beats",
                                      draft.beats.map((item) =>
                                        item.id === beat.id
                                          ? { ...item, chapter: Number(event.target.value) }
                                          : item,
                                      ),
                                    )
                                  }
                                  type="number"
                                  value={beat.chapter}
                                />
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-border px-5 py-10 text-center">
                      <Sparkles
                        aria-hidden="true"
                        className="mx-auto size-6 text-muted-foreground"
                      />
                      <p className="mt-3 text-sm font-bold">No story beats yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Add the first turning point for this thread.
                      </p>
                    </div>
                  )}
                </section>
              </CardContent>
            </Card>
          ) : (
            <Card className="items-center rounded-2xl bg-card px-6 py-16 text-center ring-border">
              <Waypoints aria-hidden="true" className="size-8 text-muted-foreground" />
              <h2 className="font-heading text-xl font-semibold">Select a plot thread</h2>
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                Choose a thread from the list to develop its summary, stakes, and story beats.
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof GitBranch;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex-row items-center gap-3 rounded-2xl bg-card px-4 py-4 ring-border">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span>
        <span className="block font-heading text-xl font-semibold leading-none">{value}</span>
        <span className="mt-1 block text-xs font-bold text-muted-foreground">{label}</span>
      </span>
    </Card>
  );
}

function SectionHeading({
  icon: Icon,
  id,
  title,
}: {
  icon: typeof Target;
  id: string;
  title: string;
}) {
  return (
    <h3 className="flex items-center gap-2 font-heading text-lg font-semibold" id={id}>
      <Icon aria-hidden="true" className="size-4 text-primary" />
      {title}
    </h3>
  );
}
