"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
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
import { type Book, getAwthorRepository } from "@/lib/repository";

const repository = getAwthorRepository();

type BookForm = {
  title: string;
  author: string;
  coverUrl: string;
  seriesName: string;
};

const emptyForm: BookForm = {
  title: "",
  author: "",
  coverUrl: "",
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
            coverUrl: book.coverUrl ?? "",
            seriesName: book.seriesName,
          }
        : { ...emptyForm, author: defaultAuthor },
    );
    setError(null);
  }, [book, defaultAuthor, open]);

  function updateField(field: keyof BookForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const savedBook = book
        ? await repository.updateBook(book.id, {
            title: form.title,
            author: form.author,
            coverUrl: form.coverUrl || null,
            seriesName: form.seriesName,
          })
        : await repository.createBook({
            title: form.title,
            author: form.author,
            coverUrl: form.coverUrl || null,
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
      <DialogContent className="sm:max-w-xl">
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
            coverUrl={form.coverUrl}
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
              <Label htmlFor="book-cover-url">
                Cover URL <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="book-cover-url"
                onChange={(event) => updateField("coverUrl", event.target.value)}
                pattern="https?://.+"
                placeholder="https://example.com/cover.jpg"
                title="Use an http:// or https:// image URL"
                type="url"
                value={form.coverUrl}
              />
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
          <Button disabled={saving} form="book-management-form" type="submit">
            {saving && <LoaderCircle aria-hidden="true" className="animate-spin" />}
            {saving ? "Saving…" : editing ? "Save changes" : "Create book"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
            This permanently removes the book, manuscript, characters, and reading position from
            this browser. This action cannot be undone.
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
