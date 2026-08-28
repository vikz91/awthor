import {
  ArrowLeft,
  BookOpen,
  Check,
  Feather,
  FileText,
  HardDrive,
  Languages,
  ListTree,
  NotebookPen,
  PencilLine,
  ScrollText,
  Settings2,
  Users,
  Waypoints,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { BookFloatingToolbar } from "./book-floating-toolbar";

const baseBook = {
  slug: "the-long-way-home",
  title: "The Long Way Home",
  author: "Alex Parker",
  subtitle: "A quiet novel about distance, memory, and the roads that bring us back.",
  status: "First draft",
  genre: "Literary fiction",
  subgenre: "Contemporary family drama",
  language: "English (US)",
  chapters: "12",
  pages: "171",
  words: "42,680",
  charactersWithoutSpaces: "213,406",
  charactersWithSpaces: "254,781",
  preface:
    "Some journeys begin with a departure. This one began with a return. After seventeen years away, Mara Bell comes home to Stillwater carrying little more than a half-finished letter and the uneasy knowledge that the town remembers a different version of her.",
  synopsis:
    "When a winter storm closes the only road out of Stillwater, Mara must confront the family she left behind and decide which parts of the past are worth carrying forward.",
  isPartOfSeries: true,
  seriesName: "The Stillwater Roads",
  seriesPosition: "Book 1 of 3",
  lastEdited: "Today at 9:42 AM",
  created: "March 18, 2026",
  coverClass: "from-[#29362f] via-[#56624e] to-[#b9bea2]",
  currentChapterTitle: "The road at dusk",
};

const books = {
  "the-long-way-home": baseBook,
  "saltwater-static": {
    ...baseBook,
    slug: "saltwater-static",
    title: "Saltwater Static",
    subtitle: "A coastal mystery about memory, signal, and the voices the tide returns.",
    genre: "Mystery",
    subgenre: "Coastal psychological suspense",
    chapters: "6",
    pages: "73",
    words: "18,240",
    charactersWithoutSpaces: "91,204",
    charactersWithSpaces: "108,731",
    preface:
      "On certain nights, the old receiver catches voices beneath the weather report. Nora has spent years calling it interference—until one of those voices says her name.",
    synopsis:
      "A radio producer returns to the island where her sister vanished and discovers a repeating transmission that may connect three disappearances across forty years.",
    isPartOfSeries: false,
    seriesName: "Standalone novel",
    seriesPosition: "—",
    lastEdited: "Yesterday at 6:18 PM",
    created: "June 2, 2026",
    coverClass: "from-[#263f49] via-[#56717a] to-[#b8c9c7]",
    currentChapterTitle: "Voices under weather",
  },
  "paper-moons": {
    ...baseBook,
    slug: "paper-moons",
    title: "Paper Moons",
    subtitle: "A second-chance romance written in letters, borrowed light, and impossible timing.",
    status: "Revision",
    genre: "Romance",
    subgenre: "Second-chance contemporary romance",
    chapters: "22",
    pages: "284",
    words: "71,010",
    charactersWithoutSpaces: "355,084",
    charactersWithSpaces: "423,960",
    preface:
      "June kept every letter except the one she meant to send. Ten years later, it arrives at Theo's door with no postmark and a date that has not happened yet.",
    synopsis:
      "Two former sweethearts reconnect through a box of undelivered letters and must decide whether knowing how their story might end makes beginning again easier or impossible.",
    isPartOfSeries: true,
    seriesName: "The Lunar Letters",
    seriesPosition: "Book 2 of 2",
    lastEdited: "Three days ago",
    created: "January 11, 2026",
    coverClass: "from-[#6a4746] via-[#9b706a] to-[#dcc0ae]",
    currentChapterTitle: "The letter dated tomorrow",
  },
  "wildlight-orchard": {
    ...baseBook,
    slug: "wildlight-orchard",
    title: "Wildlight Orchard",
    subtitle: "A folkloric fantasy about a harvest that remembers every promise made beneath it.",
    status: "Outline",
    genre: "Fantasy",
    subgenre: "Folkloric cozy fantasy",
    chapters: "3",
    pages: "20",
    words: "4,890",
    charactersWithoutSpaces: "24,612",
    charactersWithSpaces: "29,404",
    preface:
      "The orchard blooms only once every seven years, and each fruit carries the memory of the person who planted its seed. This year, one tree remembers a murder.",
    synopsis:
      "An apprentice orchard keeper investigates an impossible memory while protecting a magical harvest from the family that believes it belongs to them.",
    isPartOfSeries: false,
    seriesName: "Standalone novel",
    seriesPosition: "—",
    lastEdited: "Six days ago",
    created: "August 19, 2026",
    coverClass: "from-[#493d31] via-[#796950] to-[#cbb98c]",
    currentChapterTitle: "A memory in the roots",
  },
};

type BookSlug = keyof typeof books;

function isBookSlug(value: string): value is BookSlug {
  return value in books;
}

export function generateStaticParams() {
  return Object.keys(books).map((bookId) => ({ bookId }));
}

export async function generateMetadata({
  params,
}: PageProps<"/books/[bookId]">): Promise<Metadata> {
  const { bookId } = await params;

  if (!isBookSlug(bookId)) {
    return { title: "Book not found" };
  }

  const book = books[bookId];

  return {
    title: book.title,
    description: `Review the overview, metadata, and manuscript details for ${book.title}.`,
  };
}

export default async function BookDetailsPage({ params }: PageProps<"/books/[bookId]">) {
  const { bookId } = await params;

  if (!isBookSlug(bookId)) {
    notFound();
  }

  const book = books[bookId];
  const tabs = [
    { label: "Overview", href: `/books/${book.slug}`, icon: BookOpen, active: true },
    {
      label: "Chapters",
      href: `/books/${book.slug}/chapters`,
      icon: ListTree,
      active: false,
    },
    {
      label: "Characters",
      href: `/books/${book.slug}/characters`,
      icon: Users,
      active: false,
    },
    { label: "Plots", href: `/books/${book.slug}/plots`, icon: Waypoints, active: false },
    { label: "Notes", href: `/books/${book.slug}/notes`, icon: NotebookPen, active: false },
  ] as const;
  const stats = [
    { label: "Total chapters", value: book.chapters, icon: ListTree },
    { label: "Total pages", value: book.pages, icon: FileText },
    { label: "Word count", value: book.words, icon: Feather },
    {
      label: "Characters, no spaces",
      value: book.charactersWithoutSpaces,
      icon: ScrollText,
    },
    {
      label: "Characters, with spaces",
      value: book.charactersWithSpaces,
      icon: Languages,
    },
  ] as const;

  return (
    <main className="min-h-screen bg-background pb-28 text-foreground transition-colors">
      <header className="border-b border-border/70 bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link
            className="inline-flex items-center gap-2 rounded-lg text-sm font-bold text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            href="/books"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            All books
          </Link>
          <div className="flex items-center gap-2">
            <Badge
              className="h-7 gap-1.5 border-primary/20 bg-primary/10 px-3 text-primary"
              variant="outline"
            >
              <HardDrive aria-hidden="true" className="size-3.5!" />
              <span className="hidden sm:inline">Saved on this device</span>
            </Badge>
            <Link
              aria-label="Author and app settings"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "rounded-xl")}
              href="/onboarding"
            >
              <Settings2 aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 sm:py-10 lg:px-10">
        <section
          className="scroll-mt-6 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12"
          id="overview"
        >
          <div className="mx-auto w-full max-w-60 lg:mx-0">
            <div
              className={`relative aspect-[2/3] overflow-hidden rounded-[1.35rem] bg-gradient-to-br p-6 text-white shadow-[0_24px_50px_rgba(43,48,40,0.22)] ring-1 ring-black/8 ${book.coverClass}`}
            >
              <div
                aria-hidden="true"
                className="absolute -top-12 -right-16 size-52 rounded-full border border-white/15"
              />
              <div
                aria-hidden="true"
                className="absolute right-[-18%] bottom-[-10%] size-56 rounded-full bg-white/10 blur-sm"
              />
              <div className="relative flex h-full flex-col">
                <span className="font-serif text-xs tracking-[0.25em] text-white/60">A NOVEL</span>
                <div className="my-auto">
                  <BookOpen aria-hidden="true" className="mb-5 size-6 text-white/65" />
                  <h1 className="font-heading text-3xl leading-[1.05] font-semibold tracking-[-0.04em]">
                    {book.title}
                  </h1>
                </div>
                <p className="text-xs font-bold tracking-[0.16em] text-white/70 uppercase">
                  Alex Parker
                </p>
              </div>
            </div>
            <p className="mt-4 text-center text-xs font-semibold text-muted-foreground lg:text-left">
              Cover artwork is stored locally
            </p>
          </div>

          <div className="min-w-0 self-center">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">{book.status}</Badge>
              <Badge className="border-border bg-card/60 text-muted-foreground" variant="outline">
                {book.genre}
              </Badge>
            </div>
            <h2 className="mt-4 max-w-3xl font-heading text-4xl leading-none font-semibold tracking-[-0.045em] sm:text-5xl">
              {book.title}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              {book.subtitle}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg shadow-foreground/10 transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                href={`/books/${book.slug}/chapters`}
              >
                <PencilLine aria-hidden="true" className="size-4" />
                Continue writing
              </Link>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                <Check aria-hidden="true" className="size-3.5 text-primary" />
                Last edited {book.lastEdited.toLowerCase()}
              </span>
            </div>

            <dl className="mt-8 grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-3 xl:grid-cols-5">
              {stats.map((stat) => (
                <div
                  className="border-border p-4 not-last:border-r max-sm:nth-[n+3]:border-t sm:nth-[n+4]:border-t xl:nth-[n+4]:border-t-0"
                  key={stat.label}
                >
                  <dt className="flex items-center gap-1.5 text-[11px] leading-4 font-extrabold text-muted-foreground uppercase">
                    <stat.icon aria-hidden="true" className="size-3.5" />
                    {stat.label}
                  </dt>
                  <dd className="mt-1.5 font-heading text-xl font-semibold tracking-tight">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <nav
          aria-label="Book sections"
          className="mt-10 overflow-x-auto border-b border-border lg:mt-12"
        >
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => (
              <Link
                aria-current={tab.active ? "page" : undefined}
                className={`relative inline-flex h-12 items-center gap-2 px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring ${
                  tab.active
                    ? "text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                href={tab.href}
                key={tab.label}
              >
                <tab.icon aria-hidden="true" className="size-4" />
                {tab.label}
              </Link>
            ))}
          </div>
        </nav>

        <section className="mt-7 grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.75fr)]">
          <div className="grid gap-6">
            <Card className="gap-5 bg-card py-6 shadow-none ring-border">
              <CardHeader className="px-5 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold tracking-[0.14em] text-primary uppercase">
                      Front matter
                    </p>
                    <CardTitle className="mt-1 text-xl font-semibold">Preface</CardTitle>
                  </div>
                  <Badge className="bg-muted text-muted-foreground" variant="secondary">
                    58 words
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-5 sm:px-6">
                <label className="sr-only" htmlFor="book-preface">
                  Book preface
                </label>
                <Textarea
                  className="min-h-40 resize-y rounded-xl border-input bg-background/70 px-4 py-3 font-serif text-base leading-7 text-foreground shadow-inner"
                  defaultValue={book.preface}
                  id="book-preface"
                  readOnly
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  This mock field previews how longer book metadata will be edited.
                </p>
              </CardContent>
            </Card>

            <Card className="scroll-mt-6 gap-5 bg-card py-6 shadow-none ring-border" id="chapters">
              <CardHeader className="px-5 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold tracking-[0.14em] text-primary uppercase">
                      Manuscript
                    </p>
                    <CardTitle className="mt-1 text-xl font-semibold">Chapters</CardTitle>
                  </div>
                  <Badge className="bg-muted text-muted-foreground" variant="secondary">
                    {book.chapters} total
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-5 sm:px-6">
                <div className="rounded-xl border border-border bg-background/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold text-muted-foreground uppercase">
                        Continue from chapter {book.chapters}
                      </p>
                      <p className="mt-1 font-heading text-lg font-semibold">
                        {book.currentChapterTitle}
                      </p>
                    </div>
                    <Badge className="bg-primary/10 text-primary" variant="secondary">
                      In progress
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Your latest chapter and all manuscript edits remain saved on this device.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="scroll-mt-6 gap-5 bg-card py-6 shadow-none ring-border" id="metadata">
              <CardHeader className="px-5 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold tracking-[0.14em] text-primary uppercase">
                      Book information
                    </p>
                    <CardTitle className="mt-1 text-xl font-semibold">Metadata</CardTitle>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                    <PencilLine aria-hidden="true" className="size-3.5" />
                    Editable fields
                  </span>
                </div>
              </CardHeader>
              <CardContent className="grid gap-5 px-5 sm:grid-cols-2 sm:px-6">
                <MockField id="book-title" label="Working title" value={book.title} />
                <MockField id="book-author" label="Author" value={book.author} />
                <MockField id="book-genre" label="Genre" value={book.genre} />
                <MockField id="book-subgenre" label="Subgenre" value={book.subgenre} />
                <MockField id="book-language" label="Language" value={book.language} />
                <MockField id="book-status" label="Manuscript status" value={book.status} />
                <div className="sm:col-span-2">
                  <label
                    className="text-xs font-extrabold text-muted-foreground"
                    htmlFor="book-synopsis"
                  >
                    Synopsis
                  </label>
                  <Textarea
                    className="mt-2 min-h-28 resize-y rounded-xl border-input bg-background/70 px-3.5 py-3 leading-6"
                    defaultValue={book.synopsis}
                    id="book-synopsis"
                    readOnly
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="grid gap-6" aria-label="Additional book details">
            <Card className="gap-5 bg-card py-6 shadow-none ring-border">
              <CardHeader className="px-5 sm:px-6">
                <CardTitle className="text-xl font-semibold">Series</CardTitle>
              </CardHeader>
              <CardContent className="px-5 sm:px-6">
                <div className="flex items-center justify-between rounded-xl bg-muted p-3.5">
                  <span className="text-sm font-bold text-foreground">Part of a series?</span>
                  <Badge className="bg-primary text-primary-foreground">
                    {book.isPartOfSeries ? "Yes" : "No"}
                  </Badge>
                </div>
                <dl className="mt-5 divide-y divide-border">
                  <div className="flex items-start justify-between gap-6 py-3 first:pt-0">
                    <dt className="text-sm text-muted-foreground">Series name</dt>
                    <dd className="text-right text-sm font-bold">{book.seriesName}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-6 py-3 last:pb-0">
                    <dt className="text-sm text-muted-foreground">Position</dt>
                    <dd className="text-right text-sm font-bold">{book.seriesPosition}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card className="gap-5 bg-card py-6 shadow-none ring-border">
              <CardHeader className="px-5 sm:px-6">
                <CardTitle className="text-xl font-semibold">Project details</CardTitle>
              </CardHeader>
              <CardContent className="px-5 sm:px-6">
                <dl className="divide-y divide-border">
                  <div className="flex items-start justify-between gap-6 py-3 first:pt-0">
                    <dt className="text-sm text-muted-foreground">Created</dt>
                    <dd className="text-right text-sm font-bold">{book.created}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-6 py-3">
                    <dt className="text-sm text-muted-foreground">Last edited</dt>
                    <dd className="text-right text-sm font-bold">{book.lastEdited}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-6 py-3 last:pb-0">
                    <dt className="text-sm text-muted-foreground">Storage</dt>
                    <dd className="inline-flex items-center gap-1.5 text-right text-sm font-bold">
                      <HardDrive aria-hidden="true" className="size-3.5 text-primary" />
                      This device
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
      <BookFloatingToolbar
        bookId={book.slug}
        characterCount={book.charactersWithoutSpaces}
        characterCountWithSpaces={book.charactersWithSpaces}
        wordCount={book.words}
      />
    </main>
  );
}

function MockField({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div>
      <label className="text-xs font-extrabold text-muted-foreground" htmlFor={id}>
        {label}
      </label>
      <Input
        className="mt-2 h-10 rounded-xl border-input bg-background/70 px-3.5 font-semibold"
        id={id}
        readOnly
        value={value}
      />
    </div>
  );
}
