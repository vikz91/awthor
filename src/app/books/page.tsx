import {
  BookOpen,
  ChevronRight,
  Flame,
  HardDrive,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your books",
  description: "A private, local-first library for your novels and works in progress.",
};

const books = [
  {
    slug: "the-long-way-home",
    title: "The Long Way Home",
    genre: "Literary fiction",
    words: "42,680",
    target: "80,000",
    chapters: 12,
    progress: 53,
    updated: "2 hours ago",
    coverClass: "from-[#2f3931] via-[#56624d] to-[#aab294]",
    label: "Last opened",
    roman: "I",
  },
  {
    slug: "saltwater-static",
    title: "Saltwater Static",
    genre: "Mystery",
    words: "18,240",
    target: "65,000",
    chapters: 6,
    progress: 28,
    updated: "Yesterday",
    coverClass: "from-[#263f49] via-[#56717a] to-[#b8c9c7]",
    label: "First draft",
    roman: "II",
  },
  {
    slug: "paper-moons",
    title: "Paper Moons",
    genre: "Romance",
    words: "71,010",
    target: "75,000",
    chapters: 22,
    progress: 95,
    updated: "3 days ago",
    coverClass: "from-[#6a4746] via-[#9b706a] to-[#dcc0ae]",
    label: "Nearly there",
    roman: "III",
  },
  {
    slug: "wildlight-orchard",
    title: "Wildlight Orchard",
    genre: "Fantasy",
    words: "4,890",
    target: "90,000",
    chapters: 3,
    progress: 5,
    updated: "6 days ago",
    coverClass: "from-[#493d31] via-[#796950] to-[#cbb98c]",
    label: "New idea",
    roman: "IV",
  },
];

const summary = [
  { label: "Total words", value: "136,820", detail: "Across 4 books" },
  { label: "Writing streak", value: "6 days", detail: "+682 words today", icon: Flame },
  { label: "Daily target", value: "85%", detail: "682 of 800 words" },
];

export default function BooksPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <header className="border-b border-border/70 bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-5 sm:px-8">
          <Link className="flex items-center gap-2.5 font-heading text-lg font-semibold" href="/">
            <BrandMark size={34} />
            awthor
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Workspace">
            <Link
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "rounded-xl")}
              href="/books"
            >
              Books
            </Link>
            <Link
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-xl")}
              href="/onboarding"
            >
              Author profile
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Badge className="hidden gap-1.5 sm:inline-flex" variant="outline">
              <HardDrive aria-hidden="true" />
              Stored on this device
            </Badge>
            <Link
              aria-label="Author and app settings"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "rounded-xl")}
              href="/onboarding"
            >
              <Settings2 aria-hidden="true" />
            </Link>
            <div className="grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              AP
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Your local writing desk
            </p>
            <h1 className="mt-2 font-heading text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Good morning, Alex.
            </h1>
            <p className="mt-2 text-muted-foreground">
              Continue a draft or make room for a new story.
            </p>
          </div>
          <button
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-10 self-start rounded-xl px-4 sm:self-auto",
            )}
            type="button"
          >
            <Plus aria-hidden="true" />
            New book
          </button>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-3" aria-label="Writing summary">
          {summary.map((item) => (
            <Card className="gap-3 bg-card/80 py-4 shadow-none" key={item.label} size="sm">
              <CardHeader>
                <CardDescription className="text-xs font-semibold">{item.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <p className="font-heading text-2xl font-semibold tracking-tight">{item.value}</p>
                  {item.icon ? (
                    <item.icon aria-hidden="true" className="size-5 text-chart-2" />
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-10" aria-labelledby="books-heading">
          <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold" id="books-heading">
                Your books
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Four works in progress</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search
                aria-hidden="true"
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <label className="sr-only" htmlFor="book-search">
                Search books
              </label>
              <Input className="pl-9" id="book-search" placeholder="Search your books..." />
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {books.map((book) => (
              <Card
                className="group gap-0 overflow-hidden py-0 shadow-none transition hover:-translate-y-0.5 hover:shadow-md"
                key={book.slug}
              >
                <Link
                  className={`relative flex aspect-[4/3] flex-col justify-between overflow-hidden bg-gradient-to-br p-5 text-white ${book.coverClass}`}
                  href={`/books/${book.slug}`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-serif text-xs tracking-[0.22em] text-white/65">
                      {book.roman}
                    </span>
                    <span className="rounded-full bg-black/15 px-2.5 py-1 text-[10px] font-bold backdrop-blur">
                      {book.label}
                    </span>
                  </div>
                  <div>
                    <BookOpen aria-hidden="true" className="mb-3 size-5 text-white/60" />
                    <p className="max-w-48 font-heading text-2xl leading-7 font-semibold tracking-tight">
                      {book.title}
                    </p>
                  </div>
                </Link>

                <CardHeader className="pt-5">
                  <div>
                    <CardTitle className="truncate text-lg">{book.title}</CardTitle>
                    <CardDescription className="mt-1">{book.genre}</CardDescription>
                  </div>
                  <CardAction>
                    <button
                      aria-label={`More options for ${book.title}`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon-sm" }),
                        "rounded-lg",
                      )}
                      type="button"
                    >
                      <MoreHorizontal aria-hidden="true" />
                    </button>
                  </CardAction>
                </CardHeader>

                <CardContent className="pb-5">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>{book.words} words</span>
                    <span>{book.progress}%</span>
                  </div>
                  <Progress aria-label={`${book.title} progress`} value={book.progress} />
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{book.chapters} chapters</span>
                    <span>Edited {book.updated}</span>
                  </div>
                </CardContent>

                <CardFooter className="border-t py-3">
                  <Link
                    className="flex w-full items-center justify-between text-sm font-semibold text-primary"
                    href={`/books/${book.slug}`}
                  >
                    Open book
                    <ChevronRight aria-hidden="true" className="size-4" />
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
