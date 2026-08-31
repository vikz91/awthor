"use client";

import { AlertCircle, BookDown, Check, Clipboard, FileDown, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type BookExportSnapshot, createBookMarkdown, createPdfFilename } from "@/lib/book-export";
import { cn } from "@/lib/utils";

type BookExportProps = {
  snapshot: BookExportSnapshot;
};

type ExportState = "idle" | "working" | "copied" | "downloaded" | "error";

export function BookExport({ snapshot }: BookExportProps) {
  const [state, setState] = useState<ExportState>("idle");
  const [message, setMessage] = useState("Export book");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
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
    announce("working", "Building your PDF…", false);
    try {
      const { createBookPdf } = await import("@/lib/book-pdf");
      const document = await createBookPdf(snapshot);
      downloadFile(document, createPdfFilename(snapshot.book), "application/pdf");
      announce("downloaded", "PDF downloaded.");
    } catch {
      announce("error", "The PDF could not be created.");
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
      : state === "copied" || state === "downloaded"
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
                <span className="text-xs text-muted-foreground">
                  Download a PDF for reading or sharing
                </span>
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
    </>
  );
}

function downloadFile(contents: Blob | Uint8Array, filename: string, type: string) {
  let file: Blob;
  if (contents instanceof Uint8Array) {
    const bytes = new Uint8Array(contents.byteLength);
    bytes.set(contents);
    file = new Blob([bytes.buffer], { type });
  } else {
    file = contents;
  }
  const url = URL.createObjectURL(file);
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
