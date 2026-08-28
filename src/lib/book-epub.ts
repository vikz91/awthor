import { strToU8, type Zippable, zipSync } from "fflate";
import type { BookExportSnapshot } from "@/lib/book-export";
import { sanitizeMarkdownUrl, withoutLeadingMarkdownTitle } from "@/lib/markdown";
import type { Book } from "@/lib/repository";

const epubMimeType = "application/epub+zip";
const packagePath = "EPUB/package.opf";
const fixedArchiveDate = new Date("1980-01-01T00:00:00.000Z");

type EpubSection = {
  filename: string;
  id: string;
  label: string;
  xhtml: string;
};

export function createEpubFilename(book: Book): string {
  const title = singleLine(book.title, "Untitled book").replace(/[\\/:*?"<>|]+/gu, "-");
  return `${title}.epub`;
}

/** Builds a cover-free, reflowable EPUB 3 publication entirely in memory. */
export function createBookEpub({ book, chapters }: BookExportSnapshot): Uint8Array {
  const language = normalizeLanguage(book.language);
  const titleSection: EpubSection = {
    filename: "title.xhtml",
    id: "title-page",
    label: "Title page",
    xhtml: createTitlePage(book, language),
  };
  const prefaceSection = book.preface.trim()
    ? {
        filename: "preface.xhtml",
        id: "preface",
        label: "Preface",
        xhtml: createContentDocument(
          language,
          "Preface",
          '<section epub:type="preface"><h1>Preface</h1>' +
            markdownToEpubXhtml(book.preface) +
            "</section>",
        ),
      }
    : null;
  const chapterSections = chapters.map((chapter, index): EpubSection => {
    const position = String(index + 1).padStart(3, "0");
    const title = singleLine(chapter.title, `Chapter ${index + 1}`);
    return {
      filename: `chapter-${position}.xhtml`,
      id: `chapter-${position}`,
      label: title,
      xhtml: createContentDocument(
        language,
        title,
        `<article epub:type="chapter"><header><p class="chapter-number">Chapter ${escapeXml(
          String(chapter.number),
        )}</p><h1>${escapeXml(title)}</h1></header>${markdownToEpubXhtml(
          withoutLeadingMarkdownTitle(chapter.body),
        )}</article>`,
      ),
    };
  });
  const sections = [titleSection, ...(prefaceSection ? [prefaceSection] : []), ...chapterSections];

  const files: Zippable = {
    mimetype: [strToU8(epubMimeType), { level: 0 }],
    "META-INF/container.xml": strToU8(createContainerDocument()),
    "EPUB/styles.css": strToU8(epubStyles),
    "EPUB/nav.xhtml": strToU8(createNavigationDocument(book, language, sections)),
    [packagePath]: strToU8(createPackageDocument(book, language, sections)),
    ...Object.fromEntries(
      sections.map((section) => [`EPUB/${section.filename}`, strToU8(section.xhtml)]),
    ),
  };

  return zipSync(files, { level: 6, mtime: fixedArchiveDate });
}

function createContainerDocument(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="${packagePath}" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>`;
}

function createPackageDocument(book: Book, language: string, sections: readonly EpubSection[]) {
  const modified = normalizeModifiedDate(book.updatedAt);
  const identifier = `urn:awthor:${encodeURIComponent(book.id)}`;
  const creator = book.author.trim()
    ? `\n    <dc:creator>${escapeXml(singleLine(book.author))}</dc:creator>`
    : "";
  const description = book.synopsis.trim()
    ? `\n    <dc:description>${escapeXml(singleLine(book.synopsis))}</dc:description>`
    : "";
  const manifest = sections
    .map(
      (section) =>
        `    <item id="${section.id}" href="${section.filename}" media-type="application/xhtml+xml" />`,
    )
    .join("\n");
  const spine = sections.map((section) => `    <itemref idref="${section.id}" />`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="publication-id" xml:lang="${escapeXml(language)}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="publication-id">${escapeXml(identifier)}</dc:identifier>
    <dc:title>${escapeXml(singleLine(book.title, "Untitled book"))}</dc:title>
    <dc:language>${escapeXml(language)}</dc:language>${creator}${description}
    <meta property="dcterms:modified">${modified}</meta>
  </metadata>
  <manifest>
    <item id="navigation" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
    <item id="styles" href="styles.css" media-type="text/css" />
${manifest}
  </manifest>
  <spine>
${spine}
  </spine>
</package>`;
}

function createNavigationDocument(
  book: Book,
  language: string,
  sections: readonly EpubSection[],
): string {
  const items = sections
    .map(
      (section) => `        <li><a href="${section.filename}">${escapeXml(section.label)}</a></li>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeXml(language)}" lang="${escapeXml(language)}">
  <head>
    <meta charset="UTF-8" />
    <title>Contents · ${escapeXml(singleLine(book.title, "Untitled book"))}</title>
    <link rel="stylesheet" type="text/css" href="styles.css" />
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>Contents</h1>
      <ol>
${items}
      </ol>
    </nav>
  </body>
</html>`;
}

function createTitlePage(book: Book, language: string): string {
  const series =
    book.isPartOfSeries && book.seriesName.trim()
      ? `<p class="series">${escapeXml(singleLine(book.seriesName))}${
          book.seriesPosition ? ` · Book ${book.seriesPosition}` : ""
        }</p>`
      : "";
  const subtitle = book.subtitle.trim()
    ? `<p class="subtitle">${escapeXml(singleLine(book.subtitle))}</p>`
    : "";
  const author = book.author.trim()
    ? `<p class="author">By ${escapeXml(singleLine(book.author))}</p>`
    : "";

  return createContentDocument(
    language,
    singleLine(book.title, "Untitled book"),
    `<section class="title-page" epub:type="titlepage">${series}<h1>${escapeXml(
      singleLine(book.title, "Untitled book"),
    )}</h1>${subtitle}${author}</section>`,
  );
}

function createContentDocument(language: string, title: string, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeXml(language)}" lang="${escapeXml(language)}">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeXml(title)}</title>
    <link rel="stylesheet" type="text/css" href="styles.css" />
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

function markdownToEpubXhtml(markdown: string): string {
  const lines = markdown.replace(/\r\n?/gu, "\n").split("\n");
  const blocks: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = /^\s*```([\w-]*)\s*$/u.exec(line);
    if (fence) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```\s*$/u.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      index += index < lines.length ? 1 : 0;
      const languageClass = fence[1]
        ? ` class="language-${escapeXml(fence[1].toLowerCase())}"`
        : "";
      blocks.push(`<pre><code${languageClass}>${escapeXml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = /^\s*(#{1,6})\s+(.+)$/u.exec(line);
    if (heading) {
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInlineMarkdown(heading[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\s{0,3}((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})\s*$/u.test(line)) {
      blocks.push("<hr />");
      index += 1;
      continue;
    }

    if (/^\s*>/u.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^\s*>/u.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/u, ""));
        index += 1;
      }
      blocks.push(`<blockquote>${markdownToEpubXhtml(quote.join("\n"))}</blockquote>`);
      continue;
    }

    if (isTableStart(lines, index)) {
      const headers = splitTableRow(lines[index]);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push(
        `<table><thead><tr>${headers
          .map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`)
          .join("")}</tr></thead><tbody>${rows
          .map(
            (row) =>
              `<tr>${headers
                .map((_, cellIndex) => `<td>${renderInlineMarkdown(row[cellIndex] ?? "")}</td>`)
                .join("")}</tr>`,
          )
          .join("")}</tbody></table>`,
      );
      continue;
    }

    const unordered = /^\s*[-+*]\s+(.+)$/u.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.+)$/u.exec(line);
    if (unordered || ordered) {
      const tag = ordered ? "ol" : "ul";
      const items: string[] = [];
      while (index < lines.length) {
        const match =
          tag === "ol"
            ? /^\s*\d+[.)]\s+(.+)$/u.exec(lines[index])
            : /^\s*[-+*]\s+(.+)$/u.exec(lines[index]);
        if (!match) {
          break;
        }
        const task = /^\[([ xX])\]\s+(.+)$/u.exec(match[1]);
        items.push(
          task
            ? `<li class="task-item"><span aria-hidden="true">${task[1].toLowerCase() === "x" ? "☑" : "☐"}</span> ${renderInlineMarkdown(task[2])}</li>`
            : `<li>${renderInlineMarkdown(match[1])}</li>`,
        );
        index += 1;
      }
      blocks.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    if (paragraph.length === 0) {
      paragraph.push(line.trim());
      index += 1;
    }
    blocks.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
  }

  return blocks.join("\n");
}

function renderInlineMarkdown(source: string): string {
  const protectedHtml: string[] = [];
  const protect = (html: string) => `\uE000${protectedHtml.push(html) - 1}\uE001`;
  let working = source.replace(/`([^`]+)`/gu, (_match, code: string) =>
    protect(`<code>${escapeXml(code)}</code>`),
  );

  working = working.replace(/!\[([^\]]*)\]\([^)]*\)/gu, (_match, alt: string) =>
    protect(`<span class="image-description">Image: ${escapeXml(alt || "Untitled")}</span>`),
  );
  working = working.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/gu,
    (_match, label: string, href: string) => {
      const safeHref = sanitizeMarkdownUrl(href, "link");
      const portableHref =
        safeHref &&
        (safeHref.startsWith("https://") ||
          safeHref.startsWith("http://") ||
          safeHref.startsWith("mailto:") ||
          safeHref.startsWith("#"))
          ? safeHref
          : null;
      const content = renderInlineMarkdown(label);
      return protect(
        portableHref
          ? `<a href="${escapeXml(portableHref)}">${content}</a>`
          : `<span>${content}</span>`,
      );
    },
  );

  working = escapeXml(working)
    .replace(/\*\*([^*]+)\*\*/gu, "<strong>$1</strong>")
    .replace(/__([^_]+)__/gu, "<strong>$1</strong>")
    .replace(/~~([^~]+)~~/gu, "<del>$1</del>")
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/gu, "$1<em>$2</em>")
    .replace(/(^|[^_])_([^_]+)_(?!_)/gu, "$1<em>$2</em>");

  return working.replace(/\uE000(\d+)\uE001/gu, (_match, index: string) => {
    return protectedHtml[Number(index)] ?? "";
  });
}

function isBlockStart(lines: readonly string[], index: number): boolean {
  const line = lines[index];
  return (
    /^\s*```/u.test(line) ||
    /^\s*#{1,6}\s+/u.test(line) ||
    /^\s*>/u.test(line) ||
    /^\s*[-+*]\s+/u.test(line) ||
    /^\s*\d+[.)]\s+/u.test(line) ||
    /^\s{0,3}((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})\s*$/u.test(line) ||
    isTableStart(lines, index)
  );
}

function isTableStart(lines: readonly string[], index: number): boolean {
  return (
    index + 1 < lines.length &&
    lines[index].includes("|") &&
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/u.test(lines[index + 1])
  );
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/u, "")
    .replace(/\|$/u, "")
    .split("|")
    .map((cell) => cell.trim());
}

function normalizeLanguage(language: string): string {
  const normalized = singleLine(language, "en").toLowerCase();
  if (normalized === "english" || normalized.startsWith("english ")) {
    return "en";
  }
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/u.test(normalized) ? normalized : "en";
}

function normalizeModifiedDate(value: string): string {
  const parsed = Date.parse(value);
  return new Date(Number.isFinite(parsed) ? parsed : 0).toISOString().replace(/\.\d{3}Z$/u, "Z");
}

function singleLine(value: string, fallback = ""): string {
  return value.replace(/\s+/gu, " ").trim() || fallback;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&apos;");
}

const epubStyles = `
html {
  font-family: Georgia, "Times New Roman", serif;
  line-height: 1.7;
}
body {
  margin: 0 auto;
  max-width: 42em;
  padding: 6%;
}
h1, h2, h3, h4, h5, h6 {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.2;
  margin: 1.8em 0 0.7em;
}
p { margin: 0 0 1.25em; }
a { color: inherit; text-decoration-thickness: 0.08em; text-underline-offset: 0.16em; }
blockquote { border-left: 0.16em solid currentColor; margin: 1.6em 0; padding-left: 1.2em; font-style: italic; }
pre { overflow-wrap: break-word; white-space: pre-wrap; }
code { font-family: ui-monospace, "SFMono-Regular", monospace; font-size: 0.9em; }
hr { border: 0; border-top: 0.08em solid currentColor; margin: 2.5em 0; opacity: 0.35; }
li { margin: 0.45em 0; }
table { border-collapse: collapse; margin: 1.5em 0; width: 100%; }
th, td { border: 0.06em solid currentColor; padding: 0.55em; text-align: left; }
.chapter-number, .series { font-family: system-ui, -apple-system, sans-serif; font-size: 0.72em; letter-spacing: 0.16em; text-transform: uppercase; }
.title-page { display: flex; min-height: 70vh; flex-direction: column; justify-content: center; text-align: center; }
.title-page h1 { font-size: 2.5em; margin: 0.35em 0; }
.subtitle { font-size: 1.2em; font-style: italic; }
.author { margin-top: 2.5em; }
.image-description { font-style: italic; opacity: 0.72; }
.task-item { list-style: none; }
`;
