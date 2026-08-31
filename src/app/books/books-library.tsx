"use client";

import {
  BookOpen,
  HardDrive,
  Library,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppTopBar } from "@/components/app-top-bar";
import { BookCover } from "@/components/book-cover";
import { BrandMark } from "@/components/brand-mark";
import { SettingsDialog } from "@/components/settings-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { type Book, getAwthorRepository, type OnboardingDetails } from "@/lib/repository";
import { readRepositoryChange, repositoryChangedEventName } from "@/lib/webmcp/workspace-bridge";
import { BookManagementDialog, DeleteBookDialog } from "./book-management-dialog";

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
      <AppTopBar
        center={<div className="h-8 w-full max-w-md animate-pulse rounded-2xl bg-muted" />}
        left={<div className="h-9 w-28 animate-pulse rounded-xl bg-muted" />}
        right={<div className="h-8 w-24 animate-pulse rounded-xl bg-muted" />}
      />
      <main className="mx-auto w-full max-w-[92rem] px-5 pt-28 pb-16 sm:px-8">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-muted" />
        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {["first", "second", "third", "fourth", "fifth"].map((key) => (
            <div className="aspect-[2/3] animate-pulse rounded-2xl bg-muted" key={key} />
          ))}
        </div>
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
  const [query, setQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
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

      const [savedBooks, savedProfile] = await Promise.all([
        repository.books.get(),
        repository.profile.get(),
      ]);
      setBooks(savedBooks ?? []);
      setProfile(savedProfile);
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
      <AppTopBar
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

      <main className="mx-auto w-full max-w-[92rem] px-5 pt-28 pb-16 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Your books
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <HardDrive aria-hidden="true" className="size-3.5" />
              Private to this browser
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
            {groupedBooks.map(([group, groupBooks]) => (
              <section aria-labelledby={`group-${groupBooks[0].id}`} key={group}>
                <h2 className="text-sm font-semibold" id={`group-${groupBooks[0].id}`}>
                  {group === "Standalone" ? group : `${group} series`}
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 sm:gap-x-7 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                  {groupBooks.map((book) => (
                    <BookCard
                      book={book}
                      key={book.id}
                      onDelete={() => setDeletingBook(book)}
                      onEdit={() => openEditBook(book)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <SettingsDialog onOpenChange={updateSettingsQuery} onSaved={setProfile} open={settingsOpen} />
      <BookManagementDialog
        book={editingBook}
        defaultAuthor={profile?.authorName ?? ""}
        onOpenChange={setBookDialogOpen}
        onSaved={handleBookSaved}
        open={bookDialogOpen}
      />
      <DeleteBookDialog
        book={deletingBook}
        onDeleted={(bookId) => {
          setBooks((current) => current.filter((book) => book.id !== bookId));
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

function BookCard({
  book,
  onDelete,
  onEdit,
}: {
  book: Book;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <article className="group min-w-0">
      <div className="relative">
        <Link
          aria-label={`Open ${book.title}`}
          className="block rounded-2xl outline-none transition-transform duration-200 hover:-translate-y-1 focus-visible:ring-3 focus-visible:ring-ring/40 motion-reduce:transition-none"
          href={`/books/${encodeURIComponent(book.id)}`}
        >
          <BookCover
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
        <p className="mt-2 text-xs text-muted-foreground">
          {numberFormatter.format(book.wordCount)} words · {book.chapterCount}{" "}
          {book.chapterCount === 1 ? "chapter" : "chapters"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Updated {formatUpdatedAt(book.updatedAt)}
        </p>
      </div>
    </article>
  );
}

function LibraryLoading() {
  return (
    <div aria-live="polite" className="mt-20 flex flex-col items-center text-muted-foreground">
      <LoaderCircle aria-hidden="true" className="size-6 animate-spin" />
      <p className="mt-3 text-sm">Opening your local library…</p>
    </div>
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
