"use client";

import {
  BookOpen,
  Database,
  HardDrive,
  Library,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppTopBar } from "@/components/app-top-bar";
import { BookCover } from "@/components/book-cover";
import { BrandMark } from "@/components/brand-mark";
import { SettingsDialog } from "@/components/settings-dialog";
import { AccountMenu } from "@/components/sync-account-action";
import { SyncControl } from "@/components/sync-control";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { parseGenreCsv } from "@/lib/genres";
import { calculateReadingProgress, type ReadingProgress } from "@/lib/reading-progress";
import {
  type AppSettings,
  type Book,
  getAwthorRepository,
  type OnboardingDetails,
} from "@/lib/repository";
import { readRepositoryChange, repositoryChangedEventName } from "@/lib/webmcp/workspace-bridge";
import { BookManagementDialog, DeleteBookDialog } from "./book-management-dialog";
import styles from "./books-library.module.css";

const repository = getAwthorRepository();

type LoadState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string; migrationFailed: boolean };

const numberFormatter = new Intl.NumberFormat();

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  const elapsedDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (elapsedDays <= 0) {
    return "today";
  }
  if (elapsedDays === 1) {
    return "yesterday";
  }
  if (elapsedDays < 7) {
    return `${elapsedDays} days ago`;
  }

  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export function BooksLibraryFallback() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl supports-backdrop-filter:bg-background/75 lg:hidden">
        <div className="flex h-16 items-center justify-between gap-3 px-3">
          <div className="h-10 w-28 animate-pulse rounded-xl bg-muted" />
          <div className="flex gap-1.5">
            <div className="h-11 w-24 animate-pulse rounded-2xl bg-muted" />
            <div className="h-11 w-20 animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
        <div className="px-3 pb-3">
          <div className="h-11 w-full animate-pulse rounded-2xl bg-muted" />
        </div>
      </header>
      <AppTopBar
        className="hidden lg:block"
        center={<div className="h-8 w-full max-w-md animate-pulse rounded-2xl bg-muted" />}
        left={<div className="h-9 w-28 animate-pulse rounded-xl bg-muted" />}
        right={<div className="h-8 w-24 animate-pulse rounded-xl bg-muted" />}
      />
      <main className="mx-auto w-full max-w-[92rem] px-5 pt-[calc(9rem+env(safe-area-inset-top))] pb-16 sm:px-8 lg:pt-28">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-muted" />
        <LibraryLoading />
      </main>
    </div>
  );
}

export function BooksLibrary() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [books, setBooks] = useState<Book[]>([]);
  const [profile, setProfile] = useState<OnboardingDetails | null>(null);
  const [readingProgressByBook, setReadingProgressByBook] = useState<
    Record<string, ReadingProgress>
  >({});
  const [query, setQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);

  const loadLibrary = useCallback(async (retryMigration = false) => {
    setLoadState({ status: "loading" });

    try {
      const migration = retryMigration
        ? await repository.retryMigration()
        : await repository.initialize();

      if (migration.status === "failed") {
        setLoadState({
          status: "error",
          message: migration.error.message,
          migrationFailed: true,
        });
        return;
      }

      const [savedBooks, savedProfile, savedSettings] = await Promise.all([
        repository.books.get(),
        repository.profile.get(),
        repository.settings.get(),
      ]);
      const nextBooks = savedBooks ?? [];
      const progressEntries = await loadReadingProgress(nextBooks, savedSettings);
      setBooks(nextBooks);
      setProfile(savedProfile);
      setReadingProgressByBook(Object.fromEntries(progressEntries));
      setLoadState({ status: "ready" });
    } catch (cause) {
      setLoadState({
        status: "error",
        message: cause instanceof Error ? cause.message : "Your local library could not be read.",
        migrationFailed: false,
      });
    }
  }, []);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    function handleRepositoryChanged(event: Event) {
      if (readRepositoryChange(event)) {
        void loadLibrary();
      }
    }

    window.addEventListener(repositoryChangedEventName, handleRepositoryChanged);
    return () => window.removeEventListener(repositoryChangedEventName, handleRepositoryChanged);
  }, [loadLibrary]);

  useEffect(() => {
    setSettingsOpen(searchParams.get("settings") === "open");
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("new") === "open") {
      setEditingBook(null);
      setBookDialogOpen(true);
    }
  }, [searchParams]);

  const filteredBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return books;
    }

    return books.filter((book) =>
      `${book.title} ${book.author}`.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [books, query]);

  const groupedBooks = useMemo(() => {
    const groups = new Map<string, Book[]>();

    for (const book of filteredBooks) {
      const group = book.seriesName.trim() || "Standalone";
      groups.set(group, [...(groups.get(group) ?? []), book]);
    }

    return [...groups.entries()].sort(([first], [second]) => {
      if (first === "Standalone") {
        return 1;
      }
      if (second === "Standalone") {
        return -1;
      }
      return first.localeCompare(second);
    });
  }, [filteredBooks]);

  function updateSettingsQuery(open: boolean) {
    setSettingsOpen(open);
    const next = new URLSearchParams(searchParams.toString());

    if (open) {
      next.set("settings", "open");
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
      return;
    }

    next.delete("settings");
    const suffix = next.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  }

  function openNewBook() {
    setEditingBook(null);
    setBookDialogOpen(true);
  }

  function updateBookDialogOpen(open: boolean) {
    setBookDialogOpen(open);
    if (open || searchParams.get("new") !== "open") {
      return;
    }

    const next = new URLSearchParams(searchParams.toString());
    next.delete("new");
    const suffix = next.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  }

  function openEditBook(book: Book) {
    setEditingBook(book);
    setBookDialogOpen(true);
  }

  function handleBookSaved(savedBook: Book) {
    if (editingBook) {
      setBooks((current) => current.map((book) => (book.id === savedBook.id ? savedBook : book)));
      return;
    }

    setBooks((current) => [...current, savedBook]);
    router.push(`/books/${encodeURIComponent(savedBook.id)}`);
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <LibraryMobileHeader
        onNewBook={openNewBook}
        onOpenChange={setMobileMenuOpen}
        onOpenSettings={() => updateSettingsQuery(true)}
        onQueryChange={setQuery}
        open={mobileMenuOpen}
        query={query}
      />
      <AppTopBar
        className="hidden lg:block"
        left={
          <Link
            aria-label="Awthor home"
            className="flex min-w-0 items-center gap-2.5 font-heading text-lg font-semibold"
            href="/"
          >
            <BrandMark size={34} />
            <span className="hidden sm:inline">awthor</span>
          </Link>
        }
        center={
          <div className="relative w-full max-w-md">
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <label className="sr-only" htmlFor="book-search">
              Search books by title or author
            </label>
            <Input
              className="h-9 bg-input/40 pr-3 pl-9"
              id="book-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search books…"
              type="search"
              value={query}
            />
          </div>
        }
        right={
          <>
            <Badge className="hidden gap-1.5 lg:inline-flex" variant="outline">
              <HardDrive aria-hidden="true" />
              Stored on this device
            </Badge>
            <SyncControl variant="navbar" />
            <AccountMenu />
            <Button
              aria-label="Open system"
              nativeButton={false}
              render={<Link href="/test" />}
              size="icon"
              title="System"
              variant="ghost"
            >
              <Database aria-hidden="true" />
            </Button>
            <Button
              aria-label="Author and app settings"
              onClick={() => updateSettingsQuery(true)}
              size="icon"
              variant="ghost"
            >
              <Settings2 aria-hidden="true" />
            </Button>
            <Button aria-label="New book" onClick={openNewBook} size="lg">
              <Plus aria-hidden="true" />
              <span className="hidden sm:inline">New book</span>
            </Button>
          </>
        }
      />

      <main className="mx-auto w-full max-w-[92rem] px-5 pt-[calc(9rem+env(safe-area-inset-top))] pb-16 sm:px-8 lg:px-10 lg:pt-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Your books
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <HardDrive aria-hidden="true" className="size-3.5" />
              Local to this browser · Sync when you choose
            </p>
          </div>
          {loadState.status === "ready" && books.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {books.length} {books.length === 1 ? "book" : "books"}
            </p>
          )}
        </div>

        {loadState.status === "loading" && <LibraryLoading />}

        {loadState.status === "error" && (
          <LibraryError
            message={loadState.message}
            onRetry={() => void loadLibrary(loadState.migrationFailed)}
          />
        )}

        {loadState.status === "ready" && books.length === 0 && (
          <EmptyLibrary onCreate={openNewBook} />
        )}

        {loadState.status === "ready" && books.length > 0 && filteredBooks.length === 0 && (
          <div className="mt-20 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
            <Search aria-hidden="true" className="mx-auto size-6 text-muted-foreground" />
            <h2 className="mt-4 font-heading text-xl font-semibold">No books match “{query}”</h2>
            <p className="mt-2 text-sm text-muted-foreground">Try a title or author name.</p>
            <Button className="mt-5" onClick={() => setQuery("")} variant="outline">
              Clear search
            </Button>
          </div>
        )}

        {loadState.status === "ready" && filteredBooks.length > 0 && (
          <div className="mt-10 space-y-12">
            {groupedBooks.map(([group, groupBooks], groupIndex) => (
              <SeriesRack
                books={groupBooks}
                group={group}
                isFirst={groupIndex === 0}
                key={group}
                onDelete={setDeletingBook}
                onEdit={openEditBook}
                readingProgressByBook={readingProgressByBook}
              />
            ))}
          </div>
        )}
      </main>

      <SettingsDialog onOpenChange={updateSettingsQuery} onSaved={setProfile} open={settingsOpen} />
      <BookManagementDialog
        book={editingBook}
        defaultAuthor={profile?.authorName ?? ""}
        onOpenChange={updateBookDialogOpen}
        onSaved={handleBookSaved}
        open={bookDialogOpen}
      />
      <DeleteBookDialog
        book={deletingBook}
        onDeleted={(bookId) => {
          setBooks((current) => current.filter((book) => book.id !== bookId));
          setReadingProgressByBook((current) => {
            const { [bookId]: _removed, ...remaining } = current;
            return remaining;
          });
          setDeletingBook(null);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingBook(null);
          }
        }}
        open={Boolean(deletingBook)}
      />
    </div>
  );
}

function SeriesRack({
  books,
  group,
  isFirst,
  onDelete,
  onEdit,
  readingProgressByBook,
}: {
  books: Book[];
  group: string;
  isFirst: boolean;
  onDelete: (book: Book) => void;
  onEdit: (book: Book) => void;
  readingProgressByBook: Record<string, ReadingProgress>;
}) {
  const rackRef = useRef<HTMLElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const rack = rackRef.current;
    if (!rack) {
      return;
    }

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof IntersectionObserver === "undefined"
    ) {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsRevealed(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    observer.observe(rack);
    return () => observer.disconnect();
  }, []);

  const headingId = `group-${books[0].id}`;

  return (
    <section
      aria-labelledby={headingId}
      className={styles.seriesRack}
      data-first={isFirst}
      data-revealed={isRevealed}
      ref={rackRef}
    >
      <h2 className="text-sm font-semibold" id={headingId}>
        {group === "Standalone" ? group : `${group} series`}
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 sm:gap-x-7 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {books.map((book, bookIndex) => (
          <div
            className={styles.bookEntrance}
            key={book.id}
            style={{ "--book-order": Math.min(bookIndex, 8) } as CSSProperties}
          >
            <BookCard
              book={book}
              onDelete={() => onDelete(book)}
              onEdit={() => onEdit(book)}
              readingProgress={readingProgressByBook[book.id]}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

type LibraryMobileHeaderFrameProps = {
  onNewBook: () => void;
  onOpenMore: () => void;
  onQueryChange: (value: string) => void;
  query: string;
};

export function LibraryMobileHeaderFrame({
  onNewBook,
  onOpenMore,
  onQueryChange,
  query,
}: LibraryMobileHeaderFrameProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl supports-backdrop-filter:bg-background/75 lg:hidden">
      <div className="flex h-16 items-center justify-between gap-3 px-3">
        <Link aria-label="Awthor home" className="flex min-w-0 items-center gap-2.5" href="/">
          <BrandMark size={32} />
          <span className="flex min-w-0 flex-col leading-none">
            <span className="font-heading text-sm font-semibold">awthor</span>
            <span className="mt-1 text-[11px] text-muted-foreground">Books</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button aria-label="New book" className="h-11 px-3 text-xs" onClick={onNewBook} size="lg">
            <Plus aria-hidden="true" />
            New book
          </Button>
          <Button
            aria-label="More library actions"
            className="h-11 px-3 text-xs"
            onClick={onOpenMore}
            size="lg"
            variant="ghost"
          >
            <MoreHorizontal aria-hidden="true" />
            More
          </Button>
        </div>
      </div>
      <div className="px-3 pb-3">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <label className="sr-only" htmlFor="book-search-mobile">
            Search books by title or author
          </label>
          <Input
            className="h-11 bg-input/40 pr-3 pl-10"
            id="book-search-mobile"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search books…"
            type="search"
            value={query}
          />
        </div>
      </div>
    </header>
  );
}

function LibraryMobileHeader({
  onNewBook,
  onOpenChange,
  onOpenSettings,
  onQueryChange,
  open,
  query,
}: Omit<LibraryMobileHeaderFrameProps, "onOpenMore"> & {
  onOpenChange: (open: boolean) => void;
  onOpenSettings: () => void;
  open: boolean;
}) {
  function openSettings() {
    onOpenChange(false);
    onOpenSettings();
  }

  return (
    <>
      <LibraryMobileHeaderFrame
        onNewBook={onNewBook}
        onOpenMore={() => onOpenChange(true)}
        onQueryChange={onQueryChange}
        query={query}
      />
      <Drawer onOpenChange={onOpenChange} open={open}>
        <DrawerContent className="w-[min(22rem,calc(100%-0.75rem))] lg:hidden">
          <DrawerHeader>
            <DrawerTitle>Library menu</DrawerTitle>
            <DrawerDescription>Sync, account, and app settings.</DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="space-y-4 px-3 py-4">
            <SyncControl variant="settings" />

            <section
              aria-labelledby="mobile-account-heading"
              className="rounded-2xl border border-border bg-muted/30 p-3"
            >
              <div className="flex min-h-11 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <UserRound aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <h2 className="text-sm font-medium" id="mobile-account-heading">
                      Account
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">Profile and sign-in</p>
                  </div>
                </div>
                <AccountMenu />
              </div>
            </section>

            <nav aria-label="Library utilities" className="space-y-1">
              <Button
                className="h-auto min-h-14 w-full justify-start gap-3 px-3 py-2 text-left whitespace-normal"
                onClick={openSettings}
                size="lg"
                variant="ghost"
              >
                <Settings2 aria-hidden="true" className="size-5" />
                <span>
                  <span className="block">Settings</span>
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    Author profile, appearance, and preferences
                  </span>
                </span>
              </Button>
              <Button
                className="h-auto min-h-14 w-full justify-start gap-3 px-3 py-2 text-left whitespace-normal"
                nativeButton={false}
                onClick={() => onOpenChange(false)}
                render={<Link href="/test" />}
                size="lg"
                variant="ghost"
              >
                <Database aria-hidden="true" className="size-5" />
                <span>
                  <span className="block">System</span>
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    Storage and workspace diagnostics
                  </span>
                </span>
              </Button>
            </nav>

            <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground">
              <HardDrive aria-hidden="true" className="size-4" />
              Books are stored on this device
            </div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function BookCard({
  book,
  onDelete,
  onEdit,
  readingProgress,
}: {
  book: Book;
  onDelete: () => void;
  onEdit: () => void;
  readingProgress?: ReadingProgress;
}) {
  const progress = readingProgress ?? { percent: 0, remainingMinutes: 0 };
  const readingLabel =
    book.wordCount === 0
      ? "No reading time yet"
      : progress.remainingMinutes === 0
        ? "Finished"
        : `${progress.remainingMinutes} min left`;
  const genreLabel = parseGenreCsv(book.genre).join(", ");

  return (
    <article className="group min-w-0">
      <div className="relative">
        <Link
          aria-label={`Open ${book.title}`}
          className="block rounded-2xl outline-none transition-transform duration-200 hover:-translate-y-1 focus-visible:ring-3 focus-visible:ring-ring/40 motion-reduce:transition-none"
          href={`/books/${encodeURIComponent(book.id)}`}
        >
          <BookCover
            author={book.author}
            bookId={book.id}
            className="w-full shadow-sm ring-1 ring-foreground/5 transition-shadow group-hover:shadow-lg"
            coverUrl={book.coverUrl}
            title={book.title}
          />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={`Actions for ${book.title}`}
                className="absolute top-2 right-2 bg-popover/85 shadow-sm backdrop-blur"
                size="icon"
                variant="secondary"
              />
            }
          >
            <MoreHorizontal aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil aria-hidden="true" />
              Edit details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} variant="destructive">
              <Trash2 aria-hidden="true" />
              Delete book
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 min-w-0">
        <Link
          className="block truncate font-heading text-lg font-semibold tracking-tight hover:text-primary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={`/books/${encodeURIComponent(book.id)}`}
        >
          {book.title}
        </Link>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{book.author}</p>
        <div className="mt-2 flex min-w-0 items-center text-xs whitespace-nowrap text-muted-foreground">
          <span className="shrink-0">
            {numberFormatter.format(book.wordCount)} words · {book.chapterCount}{" "}
            {book.chapterCount === 1 ? "chapter" : "chapters"}
          </span>
          {genreLabel && (
            <>
              <span aria-hidden="true" className="shrink-0">
                {" · "}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    aria-label={`Genres: ${genreLabel}`}
                    closeOnClick={false}
                    delay={0}
                    className="min-w-0 cursor-help truncate rounded-sm border-0 bg-transparent p-0 text-left text-inherit hover:underline hover:decoration-dotted hover:underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {genreLabel}
                  </TooltipTrigger>
                  <TooltipContent>{genreLabel}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
        <div className="mt-3" title={`${progress.percent}% read · ${readingLabel}`}>
          <div
            aria-label={`${progress.percent}% of ${book.title} read`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress.percent}
            className="h-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
            {progress.percent}% read · {readingLabel}
          </p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Updated {formatUpdatedAt(book.updatedAt)}
        </p>
      </div>
    </article>
  );
}

async function loadReadingProgress(books: readonly Book[], settings: AppSettings | null) {
  const lastChapterByBook = settings?.lastChapterByBook ?? {};
  const readingPositionByBook = settings?.readingPositionByBook ?? {};

  return Promise.all(
    books.map(async (book) => {
      const chapters = (await repository.chapters.list(book.id)) ?? [];
      return [
        book.id,
        calculateReadingProgress({
          chapters,
          lastChapterId: lastChapterByBook[book.id],
          position: readingPositionByBook[book.id],
        }),
      ] as const;
    }),
  );
}

function LibraryLoading() {
  return (
    <output aria-live="polite" className="mt-20 flex flex-col items-center text-muted-foreground">
      <div aria-hidden="true" className={styles.turningBook}>
        <span className={styles.leftPage} />
        <span className={styles.rightPage} />
        <span className={styles.bookSpine} />
        {[0, 1, 2, 3].map((page) => (
          <span className={styles.turningPage} key={page} />
        ))}
      </div>
      <p className="mt-3 text-sm">Opening your local library…</p>
    </output>
  );
}

function EmptyLibrary({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="mx-auto mt-20 max-w-lg rounded-3xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
        <BookOpen aria-hidden="true" className="size-5" />
      </span>
      <h2 className="mt-5 font-heading text-2xl font-semibold">Make room for your first story</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Create a book and Awthor will prepare an empty Markdown chapter, stored only in this
        browser.
      </p>
      <Button className="mt-6" onClick={onCreate} size="lg">
        <Plus aria-hidden="true" />
        New book
      </Button>
    </section>
  );
}

function LibraryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="mx-auto mt-20 max-w-lg rounded-3xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <Library aria-hidden="true" className="size-5" />
      </span>
      <h2 className="mt-5 font-heading text-2xl font-semibold">Your library could not open</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
      <Button className="mt-6" onClick={onRetry} variant="outline">
        Try again
      </Button>
    </section>
  );
}
