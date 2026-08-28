"use client";

import { AlertCircle, BookDown, Check, Clipboard, FileDown, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type BookExportSnapshot,
  createBookMarkdown,
  createPdfDocumentTitle,
} from "@/lib/book-export";
import { withoutLeadingMarkdownTitle } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { MarkdownManuscript } from "./markdown-manuscript";

type BookExportProps = {
  snapshot: BookExportSnapshot;
};

type ExportState = "idle" | "working" | "copied" | "downloaded" | "print-ready" | "error";

export function BookExport({ snapshot }: BookExportProps) {
  const [mounted, setMounted] = useState(false);
  const [printSnapshot, setPrintSnapshot] = useState<BookExportSnapshot | null>(null);
  const [state, setState] = useState<ExportState>("idle");
  const [message, setMessage] = useState("Export book");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  function announce(nextState: ExportState, nextMessage: string, reset = true) {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    setState(nextState);
    setMessage(nextMessage);
    if (reset) {
      resetTimerRef.current = setTimeout(() => {
        resetTimerRef.current = null;
        setState("idle");
        setMessage("Export book");
      }, 2400);
    }
  }

  async function copyMarkdown() {
    announce("working", "Copying book Markdown…", false);
    try {
      await copyText(createBookMarkdown(snapshot));
      announce("copied", "Book Markdown copied.");
    } catch {
      announce("error", "Clipboard access was blocked. Try again.");
    }
  }

  async function exportPdf() {
    announce("working", "Preparing the print layout…", false);
    setPrintSnapshot(snapshot);
    await nextPaint();
    await waitForPrintImages();
    const previousTitle = document.title;
    document.title = createPdfDocumentTitle(snapshot.book);
    try {
      window.print();
      announce("print-ready", "Print dialog opened. Choose Save as PDF.");
    } catch {
      announce("error", "The print dialog could not be opened.");
    } finally {
      document.title = previousTitle;
      setPrintSnapshot(null);
    }
  }

  async function exportEpub() {
    announce("working", "Building the EPUB…", false);
    try {
      const { createBookEpub, createEpubFilename } = await import("@/lib/book-epub");
      const epub = createBookEpub(snapshot);
      downloadFile(epub, createEpubFilename(snapshot.book), "application/epub+zip");
      announce("downloaded", "EPUB downloaded.");
    } catch {
      announce("error", "The EPUB could not be created.");
    }
  }

  const StatusIcon =
    state === "working"
      ? LoaderCircle
      : state === "copied" || state === "downloaded" || state === "print-ready"
        ? Check
        : state === "error"
          ? AlertCircle
          : FileDown;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={message}
              className={cn(state === "error" && "text-destructive")}
              disabled={state === "working"}
              size="icon-sm"
              title={message}
              variant="ghost"
            />
          }
        >
          <StatusIcon
            aria-hidden="true"
            className={cn(state === "working" && "animate-spin motion-reduce:animate-none")}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Export complete book</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => void exportPdf()}>
              <FileDown aria-hidden="true" />
              <span className="flex min-w-0 flex-col">
                <span>Export as PDF</span>
                <span className="text-xs text-muted-foreground">Open the local print dialog</span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void exportEpub()}>
              <BookDown aria-hidden="true" />
              <span className="flex min-w-0 flex-col">
                <span>Download EPUB</span>
                <span className="text-xs text-muted-foreground">Text-only, without a cover</span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void copyMarkdown()}>
              <Clipboard aria-hidden="true" />
              <span className="flex min-w-0 flex-col">
                <span>Copy Markdown</span>
                <span className="text-xs text-muted-foreground">All chapters to the clipboard</span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <p aria-live="polite" className="sr-only">
        {message}
      </p>

      {mounted && printSnapshot
        ? createPortal(<PrintableBook snapshot={printSnapshot} />, document.body)
        : null}
    </>
  );
}

function PrintableBook({ snapshot: { book, chapters } }: { snapshot: BookExportSnapshot }) {
  const series =
    book.isPartOfSeries && book.seriesName.trim()
      ? `${book.seriesName}${book.seriesPosition ? ` · Book ${book.seriesPosition}` : ""}`
      : null;

  return (
    <main aria-hidden="true" className="book-print-export" data-book-print-export>
      <section className="book-print-title-page">
        {series ? <p className="book-print-series">{series}</p> : null}
        <h1>{book.title}</h1>
        {book.subtitle.trim() ? <p className="book-print-subtitle">{book.subtitle}</p> : null}
        {book.author.trim() ? <p className="book-print-author">By {book.author}</p> : null}
      </section>

      {book.preface.trim() ? (
        <article className="book-print-section book-print-preface">
          <h2>Preface</h2>
          <div className="book-print-markdown">
            <MarkdownManuscript imageLoading="eager" source={book.preface} />
          </div>
        </article>
      ) : null}

      {chapters.map((chapter) => (
        <article className="book-print-section book-print-chapter" key={chapter.id}>
          <header>
            <p>Chapter {chapter.number}</p>
            <h2>{chapter.title}</h2>
          </header>
          <div className="book-print-markdown">
            <MarkdownManuscript
              imageLoading="eager"
              source={withoutLeadingMarkdownTitle(chapter.body)}
            />
          </div>
        </article>
      ))}
    </main>
  );
}

function downloadFile(contents: Uint8Array, filename: string, type: string) {
  const bytes = new Uint8Array(contents.byteLength);
  bytes.set(contents);
  const url = URL.createObjectURL(new Blob([bytes.buffer], { type }));
  const anchor = document.createElement("a");
  anchor.download = filename;
  anchor.href = url;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Continue to the local selection-based fallback.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  Object.assign(textarea.style, {
    left: "-9999px",
    opacity: "0",
    position: "fixed",
    top: "0",
  });
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) {
    throw new Error("Clipboard access was blocked.");
  }
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function waitForPrintImages() {
  const images = Array.from(
    document.querySelectorAll<HTMLImageElement>("[data-book-print-export] img"),
  ).filter((image) => !image.complete);
  if (images.length === 0) {
    return;
  }

  await Promise.race([
    Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          }),
      ),
    ),
    new Promise<void>((resolve) => setTimeout(resolve, 1800)),
  ]);
}
