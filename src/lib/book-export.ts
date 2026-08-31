import { withLeadingMarkdownTitle } from "@/lib/markdown";
import type { Book, Chapter } from "@/lib/repository";

export type BookExportSnapshot = {
  book: Book;
  chapters: readonly Chapter[];
};

/** Builds a portable, single-file Markdown manuscript in the current chapter order. */
export function createBookMarkdown({ book, chapters }: BookExportSnapshot): string {
  const titleMatter = [`# ${singleLine(book.title, "Untitled book")}`];

  if (book.subtitle.trim()) {
    titleMatter.push(`_${singleLine(book.subtitle)}_`);
  }
  if (book.author.trim()) {
    titleMatter.push(`*By ${singleLine(book.author)}*`);
  }

  const sections = [titleMatter.join("\n\n")];
  if (book.preface.trim()) {
    sections.push(`## Preface\n\n${book.preface.trim()}`);
  }

  sections.push(
    ...chapters.map((chapter) => withLeadingMarkdownTitle(chapter.body, chapter.title).trimEnd()),
  );

  return sections.join("\n\n---\n\n").trimEnd().concat("\n");
}

export function createPdfDocumentTitle(book: Book): string {
  const title = singleLine(book.title, "Untitled book").replace(/[\\/:*?"<>|]+/gu, "-");
  return `${title} — Awthor`;
}

export function createPdfFilename(book: Book): string {
  const title = singleLine(book.title, "Untitled book").replace(/[\\/:*?"<>|]+/gu, "-");
  return `${title}.pdf`;
}

function singleLine(value: string, fallback = ""): string {
  return value.replace(/\s+/gu, " ").trim() || fallback;
}
