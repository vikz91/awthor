"use client";

import { LoaderCircle, Sparkles, Trash2, X } from "lucide-react";
import {
  type FormEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useState,
} from "react";
import { BookCover } from "@/components/book-cover";
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
import { Label } from "@/components/ui/label";
import { generateBookCoverDataUrl, isGeneratedBookCoverDataUrl } from "@/lib/book-cover-generator";
import { hasOpenGenreCsvQuote, mergeGenres, parseGenreCsv, serializeGenreCsv } from "@/lib/genres";
import { type Book, getAwthorRepository } from "@/lib/repository";

const repository = getAwthorRepository();

type BookForm = {
  title: string;
  author: string;
  coverUrl: string;
  genreDraft: string;
  genres: string[];
  seriesName: string;
};

const emptyForm: BookForm = {
  title: "",
  author: "",
  coverUrl: "",
  genreDraft: "",
  genres: [],
  seriesName: "",
};

type BookManagementDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (book: Book) => void;
  book?: Book | null;
  defaultAuthor?: string;
};

export function BookManagementDialog({
  open,
  onOpenChange,
  onSaved,
  book,
  defaultAuthor = "",
}: BookManagementDialogProps) {
  const editing = Boolean(book);
  const [form, setForm] = useState<BookForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [generatedCoverUrl, setGeneratedCoverUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(
      book
        ? {
            title: book.title,
            author: book.author,
            coverUrl: isGeneratedBookCoverDataUrl(book.coverUrl) ? "" : (book.coverUrl ?? ""),
            genreDraft: "",
            genres: parseGenreCsv(book.genre),
            seriesName: book.seriesName,
          }
        : { ...emptyForm, author: defaultAuthor },
    );
    setGeneratedCoverUrl(book && isGeneratedBookCoverDataUrl(book.coverUrl) ? book.coverUrl : null);
    setGeneratingCover(false);
    setError(null);
  }, [book, defaultAuthor, open]);

  function updateField(field: Exclude<keyof BookForm, "genres">, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function genreCsv(current = form) {
    return serializeGenreCsv(mergeGenres(current.genres, parseGenreCsv(current.genreDraft)));
  }

  async function generateCover() {
    if (!book) {
      return;
    }

    setGeneratingCover(true);
    setError(null);

    try {
      const coverUrl = await generateBookCoverDataUrl({
        title: form.title,
        author: form.author,
        genre: genreCsv(),
        variation: crypto.randomUUID(),
      });
      setGeneratedCoverUrl(coverUrl);
      updateField("coverUrl", "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This cover could not be generated.");
    } finally {
      setGeneratingCover(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const title = form.title.trim();
      const author = form.author.trim();
      const genre = genreCsv();
      const savedBook = book
        ? await repository.updateBook(book.id, {
            title,
            author,
            coverUrl: form.coverUrl || generatedCoverUrl,
            genre,
            seriesName: form.seriesName,
          })
        : await repository.createBook({
            title,
            author,
            coverUrl:
              form.coverUrl ||
              (await generateBookCoverDataUrl({
                title,
                author,
                genre,
                variation: crypto.randomUUID(),
              })),
            genre,
            seriesName: form.seriesName,
          });

      onSaved(savedBook);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This book could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{editing ? "Edit book" : "New book"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the details shown in your local library."
              : "Start with the essentials. Awthor creates the first empty chapter for you."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-5 sm:grid-cols-[7.5rem_minmax(0,1fr)]"
          id="book-management-form"
          onSubmit={handleSubmit}
        >
          <BookCover
            author={form.author}
            bookId={book?.id ?? "new-awthor-book"}
            className="mx-auto w-28 shadow-sm sm:mx-0 sm:w-full"
            coverUrl={form.coverUrl || generatedCoverUrl}
            title={form.title || "Untitled book"}
          />

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="book-title">Title</Label>
              <Input
                autoFocus
                id="book-title"
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="The missing page"
                required
                value={form.title}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="book-author">Author</Label>
              <Input
                autoComplete="name"
                id="book-author"
                onChange={(event) => updateField("author", event.target.value)}
                placeholder="Your pen name"
                required
                value={form.author}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="book-genre">
                Genre <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <GenreChipsInput
                draft={form.genreDraft}
                genres={form.genres}
                onDraftChange={(genreDraft) => updateField("genreDraft", genreDraft)}
                onGenresChange={(genres) => setForm((current) => ({ ...current, genres }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="book-cover-url">
                Cover URL <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="book-cover-url"
                  onChange={(event) => updateField("coverUrl", event.target.value)}
                  pattern="https?://.+"
                  placeholder="https://example.com/cover.jpg"
                  title="Use an http:// or https:// image URL"
                  type="url"
                  value={form.coverUrl}
                />
                {editing && (
                  <Button
                    aria-label={generatedCoverUrl ? "Regenerate cover" : "Generate cover"}
                    disabled={
                      generatingCover || saving || !form.title.trim() || !form.author.trim()
                    }
                    onClick={() => void generateCover()}
                    size="icon"
                    title={generatedCoverUrl ? "Regenerate cover" : "Generate cover"}
                    type="button"
                    variant="outline"
                  >
                    {generatingCover ? (
                      <LoaderCircle aria-hidden="true" className="animate-spin" />
                    ) : (
                      <Sparkles aria-hidden="true" />
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Remote image hosts receive an image request when the cover is displayed.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="book-series">
                Series <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="book-series"
                onChange={(event) => updateField("seriesName", event.target.value)}
                placeholder="Series name"
                value={form.seriesName}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={saving || generatingCover} form="book-management-form" type="submit">
            {saving && <LoaderCircle aria-hidden="true" className="animate-spin" />}
            {saving ? "Saving…" : editing ? "Save changes" : "Create book"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type GenreChipsInputProps = {
  draft: string;
  genres: string[];
  onDraftChange: (draft: string) => void;
  onGenresChange: (genres: string[]) => void;
};

function GenreChipsInput({ draft, genres, onDraftChange, onGenresChange }: GenreChipsInputProps) {
  function commitDraft(value = draft) {
    onGenresChange(mergeGenres(genres, parseGenreCsv(value)));
    onDraftChange("");
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (
      event.key === "Enter" ||
      (event.key === "," && !hasOpenGenreCsvQuote(event.currentTarget.value))
    ) {
      event.preventDefault();
      commitDraft();
      return;
    }

    if (event.key === "Backspace" && !draft && genres.length > 0) {
      event.preventDefault();
      onGenresChange(genres.slice(0, -1));
    }
  }

  function handlePaste(event: ReactClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    if (!pasted.includes(",") && !pasted.includes("\n") && !pasted.includes("\r")) {
      return;
    }

    event.preventDefault();
    commitDraft(`${draft}${pasted}`);
  }

  return (
    <>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-2xl border border-transparent bg-input/50 p-1.5 transition-[color,box-shadow] duration-200 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
        {genres.length > 0 && (
          <ul aria-label="Selected genres" className="contents">
            {genres.map((genre) => (
              <li
                className="inline-flex h-7 max-w-full items-center gap-1 rounded-full bg-secondary py-1 pr-1 pl-2.5 text-xs text-secondary-foreground"
                key={genre.toLocaleLowerCase()}
              >
                <span className="min-w-0 truncate" title={genre}>
                  {genre}
                </span>
                <button
                  aria-label={`Remove ${genre}`}
                  className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                  onClick={() => onGenresChange(genres.filter((value) => value !== genre))}
                  type="button"
                >
                  <X aria-hidden="true" className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          aria-describedby="book-genre-help"
          autoComplete="off"
          className="h-7 min-w-28 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
          id="book-genre"
          maxLength={200}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={genres.length > 0 ? "Add another…" : "Mystery, romance"}
          value={draft}
        />
      </div>
      <p className="text-xs leading-5 text-muted-foreground" id="book-genre-help">
        Press Enter or comma to add a genre, or paste a CSV list.
      </p>
    </>
  );
}

type DeleteBookDialogProps = {
  book: Book | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (bookId: string) => void;
};

export function DeleteBookDialog({ book, open, onOpenChange, onDeleted }: DeleteBookDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
    }
  }, [open]);

  async function deleteBook() {
    if (!book) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await repository.deleteBook(book.id);
      onDeleted(book.id);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This book could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trash2 aria-hidden="true" className="size-5 text-destructive" />
            Delete “{book?.title}”?
          </DialogTitle>
          <DialogDescription>
            This permanently removes the book, manuscript, characters, and reading position. If the
            book is published, its public version will be removed when this deletion syncs. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Keep book
          </Button>
          <Button disabled={!book || deleting} onClick={deleteBook} variant="destructive">
            {deleting && <LoaderCircle aria-hidden="true" className="animate-spin" />}
            {deleting ? "Deleting…" : "Delete book"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
