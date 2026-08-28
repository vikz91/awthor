import { describe, expect, test } from "bun:test";
import { strFromU8, unzipSync } from "fflate";
import { createBookEpub, createEpubFilename } from "./book-epub";
import type { Book, Chapter } from "./repository";

const now = "2026-08-28T00:00:00.000Z";

const book: Book = {
  author: "A. Writer",
  chapterCount: 2,
  characterCount: 0,
  characterCountWithSpaces: 0,
  coverUrl: "https://example.com/cover.jpg",
  createdAt: now,
  genre: "Mystery",
  id: "book-1",
  isPartOfSeries: true,
  language: "English",
  pageCount: 0,
  preface: "A **short** beginning.",
  seriesName: "The Archive",
  seriesPosition: 2,
  slug: "the-draft",
  status: "First draft",
  subgenre: "",
  subtitle: "A novel",
  synopsis: "A local-first story.",
  title: "The Draft",
  updatedAt: now,
  wordCount: 0,
};

function chapter(number: number, title: string, body: string): Chapter {
  return {
    arc: { conflict: "", goal: "", outcome: "", stage: "Unassigned", tension: 3 },
    body,
    characterCount: 0,
    characterCountWithSpaces: 0,
    createdAt: now,
    id: `chapter-${number}`,
    number,
    pov: "",
    status: "Draft",
    summary: "",
    title,
    updatedAt: now,
    wordCount: 0,
  };
}

function textEntry(files: ReturnType<typeof unzipSync>, path: string): string {
  const contents = files[path];
  if (!contents) {
    throw new Error(`Missing EPUB entry: ${path}`);
  }
  return strFromU8(contents);
}

describe("book EPUB export", () => {
  test("creates a cover-free EPUB 3 archive with an uncompressed leading mimetype entry", () => {
    const epub = createBookEpub({
      book,
      chapters: [
        chapter(1, "Arrival", "# Old title\n\nThe train arrived."),
        chapter(2, "Departure", "The platform emptied."),
      ],
    });

    expect(strFromU8(epub.subarray(0, 4))).toBe("PK\u0003\u0004");
    expect(epub[8] | (epub[9] << 8)).toBe(0);
    const filenameLength = epub[26] | (epub[27] << 8);
    const extraLength = epub[28] | (epub[29] << 8);
    expect(strFromU8(epub.subarray(30, 30 + filenameLength))).toBe("mimetype");
    expect(extraLength).toBe(0);

    const files = unzipSync(epub);
    expect(Object.keys(files)).toEqual([
      "mimetype",
      "META-INF/container.xml",
      "EPUB/styles.css",
      "EPUB/nav.xhtml",
      "EPUB/package.opf",
      "EPUB/title.xhtml",
      "EPUB/preface.xhtml",
      "EPUB/chapter-001.xhtml",
      "EPUB/chapter-002.xhtml",
    ]);
    expect(textEntry(files, "mimetype")).toBe("application/epub+zip");

    const container = textEntry(files, "META-INF/container.xml");
    expect(container).toContain('full-path="EPUB/package.opf"');

    const packageDocument = textEntry(files, "EPUB/package.opf");
    expect(packageDocument).toContain("<dc:title>The Draft</dc:title>");
    expect(packageDocument).toContain("<dc:creator>A. Writer</dc:creator>");
    expect(packageDocument).toContain('properties="nav"');
    expect(packageDocument).not.toContain("cover-image");
    expect(packageDocument).not.toContain("image/jpeg");
    expect(packageDocument).not.toContain(book.coverUrl ?? "");
  });

  test("creates ordered navigation and safe, reflowable chapter XHTML", () => {
    const epub = createBookEpub({
      book,
      chapters: [
        chapter(
          1,
          "Arrival & Return",
          [
            "# Duplicate heading",
            "",
            "A **bold** choice with [a safe link](https://example.com/read).",
            "",
            "![A distant station](https://example.com/station.jpg)",
            "",
            "[Unsafe](javascript:alert(1)) <script>alert('no')</script>",
            "",
            "- [x] Follow the clue",
            "",
            "| Beat | Result |",
            "| --- | --- |",
            "| Turn | Escape |",
          ].join("\n"),
        ),
      ],
    });
    const files = unzipSync(epub);
    const navigation = textEntry(files, "EPUB/nav.xhtml");
    expect(navigation.indexOf("title.xhtml")).toBeLessThan(navigation.indexOf("preface.xhtml"));
    expect(navigation.indexOf("preface.xhtml")).toBeLessThan(
      navigation.indexOf("chapter-001.xhtml"),
    );

    const chapterDocument = textEntry(files, "EPUB/chapter-001.xhtml");
    expect(chapterDocument).toContain("<h1>Arrival &amp; Return</h1>");
    expect(chapterDocument).not.toContain("Duplicate heading");
    expect(chapterDocument).toContain("<strong>bold</strong>");
    expect(chapterDocument).toContain('href="https://example.com/read"');
    expect(chapterDocument).toContain("Image: A distant station");
    expect(chapterDocument).not.toContain("station.jpg");
    expect(chapterDocument).not.toContain('href="javascript:');
    expect(chapterDocument).toContain("&lt;script&gt;alert(&apos;no&apos;)&lt;/script&gt;");
    expect(chapterDocument).toContain('<li class="task-item">');
    expect(chapterDocument).toContain("<table>");
  });

  test("creates filesystem-friendly filenames", () => {
    expect(createEpubFilename({ ...book, title: 'Draft: Part / One? "Again"' })).toBe(
      "Draft- Part - One- -Again-.epub",
    );
    expect(createEpubFilename({ ...book, title: "   " })).toBe("Untitled book.epub");
  });
});
