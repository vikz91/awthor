import type { DocumentProps } from "@react-pdf/renderer";
import { Document, Font, Page, pdf, StyleSheet, Text, View } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import type { BookExportSnapshot } from "@/lib/book-export";
import { withoutLeadingMarkdownTitle } from "@/lib/markdown";

const fontFamily = "Awthor Noto Serif Bengali";
let fontRegistered = false;

type PdfBlock = {
  kind: "code" | "heading" | "list" | "paragraph" | "quote";
  text: string;
};

const styles = StyleSheet.create({
  author: { fontSize: 12, marginTop: 42 },
  chapter: { break: true },
  chapterNumber: {
    color: "#746f64",
    fontFamily: "Helvetica",
    fontSize: 8,
    letterSpacing: 1.6,
    marginBottom: 11,
    textTransform: "uppercase",
  },
  code: {
    backgroundColor: "#f2eee5",
    fontFamily: "Courier",
    fontSize: 9,
    lineHeight: 1.5,
    marginBottom: 13,
    padding: 10,
  },
  heading: { fontSize: 17, lineHeight: 1.25, marginBottom: 11, marginTop: 14 },
  list: { fontSize: 11, lineHeight: 1.65, marginBottom: 7, paddingLeft: 12 },
  page: { backgroundColor: "#fffdf8", color: "#24211c", fontFamily, padding: "72 62 76" },
  pageNumber: {
    bottom: 34,
    color: "#746f64",
    fontFamily: "Helvetica",
    fontSize: 8,
    position: "absolute",
    right: 62,
  },
  paragraph: { fontSize: 11.5, lineHeight: 1.72, marginBottom: 13 },
  quote: {
    borderLeftColor: "#7c8a5a",
    borderLeftWidth: 2,
    color: "#454036",
    fontSize: 11.5,
    lineHeight: 1.7,
    marginBottom: 13,
    paddingLeft: 12,
  },
  sectionTitle: { fontSize: 25, lineHeight: 1.18, marginBottom: 29 },
  series: {
    color: "#746f64",
    fontFamily: "Helvetica",
    fontSize: 8.5,
    letterSpacing: 1.6,
    marginBottom: 32,
    textTransform: "uppercase",
  },
  subtitle: { color: "#746f64", fontSize: 15, lineHeight: 1.35, marginTop: 13 },
  title: { fontSize: 34, lineHeight: 1.14, textAlign: "center" },
  titlePage: { alignItems: "center", flex: 1, justifyContent: "center", textAlign: "center" },
});

/** Generates a downloadable, browser-native PDF without depending on a print dialog. */
export async function createBookPdf(snapshot: BookExportSnapshot): Promise<Blob> {
  registerFont();
  const document = createElement(BookPdfDocument, { snapshot }) as ReactElement<DocumentProps>;
  return pdf(document).toBlob();
}

function BookPdfDocument({ snapshot: { book, chapters } }: { snapshot: BookExportSnapshot }) {
  const series =
    book.isPartOfSeries && book.seriesName.trim()
      ? `${book.seriesName}${book.seriesPosition ? ` · Book ${book.seriesPosition}` : ""}`
      : null;

  return (
    <Document author={book.author || undefined} title={book.title}>
      <Page size="A4" style={styles.page}>
        <View style={styles.titlePage}>
          {series ? <Text style={styles.series}>{series}</Text> : null}
          <Text style={styles.title}>{book.title}</Text>
          {book.subtitle.trim() ? <Text style={styles.subtitle}>{book.subtitle}</Text> : null}
          {book.author.trim() ? <Text style={styles.author}>By {book.author}</Text> : null}
        </View>
      </Page>

      {book.preface.trim() ? (
        <Page size="A4" style={styles.page} wrap>
          <Text style={styles.sectionTitle}>Preface</Text>
          <PdfBlocks source={book.preface} />
          <PageNumber />
        </Page>
      ) : null}

      {chapters.map((chapter) => (
        <Page key={chapter.id} size="A4" style={styles.page} wrap>
          <View style={styles.chapter}>
            <Text style={styles.chapterNumber}>Chapter {chapter.number}</Text>
            <Text style={styles.sectionTitle}>{chapter.title}</Text>
            <PdfBlocks source={withoutLeadingMarkdownTitle(chapter.body)} />
          </View>
          <PageNumber />
        </Page>
      ))}
    </Document>
  );
}

function PdfBlocks({ source }: { source: string }) {
  return markdownToPdfBlocks(source).map((block, index) => {
    const key = `${block.kind}-${index}`;
    if (block.kind === "heading")
      return (
        <Text key={key} style={styles.heading}>
          {block.text}
        </Text>
      );
    if (block.kind === "quote")
      return (
        <Text key={key} style={styles.quote}>
          {block.text}
        </Text>
      );
    if (block.kind === "code")
      return (
        <Text key={key} style={styles.code}>
          {block.text}
        </Text>
      );
    if (block.kind === "list")
      return (
        <Text key={key} style={styles.list}>
          • {block.text}
        </Text>
      );
    return (
      <Text key={key} style={styles.paragraph}>
        {block.text}
      </Text>
    );
  });
}

function PageNumber() {
  return <Text fixed render={({ pageNumber }) => String(pageNumber)} style={styles.pageNumber} />;
}

export function markdownToPdfBlocks(source: string): PdfBlock[] {
  const lines = source.replace(/\r\n?/gu, "\n").split("\n");
  const blocks: PdfBlock[] = [];
  let paragraph: string[] = [];
  let code: string[] | null = null;

  const pushParagraph = () => {
    const text = cleanMarkdownText(paragraph.join(" "));
    if (text) blocks.push({ kind: "paragraph", text });
    paragraph = [];
  };

  for (const rawLine of lines) {
    if (/^\s*```/u.test(rawLine)) {
      pushParagraph();
      if (code) {
        blocks.push({ kind: "code", text: code.join("\n") });
        code = null;
      } else {
        code = [];
      }
      continue;
    }
    if (code) {
      code.push(rawLine);
      continue;
    }
    if (!rawLine.trim()) {
      pushParagraph();
      continue;
    }

    const heading = /^\s{0,3}#{1,6}\s+(.+)$/u.exec(rawLine);
    if (heading) {
      pushParagraph();
      blocks.push({ kind: "heading", text: cleanMarkdownText(heading[1]) });
      continue;
    }
    const quote = /^\s*>\s?(.*)$/u.exec(rawLine);
    if (quote) {
      pushParagraph();
      blocks.push({ kind: "quote", text: cleanMarkdownText(quote[1]) });
      continue;
    }
    const list = /^\s*(?:[-*+]\s+|\d+[.)]\s+)(.*)$/u.exec(rawLine);
    if (list) {
      pushParagraph();
      blocks.push({ kind: "list", text: cleanMarkdownText(list[1]) });
      continue;
    }
    paragraph.push(rawLine.trim());
  }

  pushParagraph();
  if (code?.length) blocks.push({ kind: "code", text: code.join("\n") });
  return blocks;
}

function cleanMarkdownText(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/gu, (_, alt: string) => (alt ? `[Image: ${alt}]` : "[Image]"))
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
    .replace(/(`+)(.*?)\1/gu, "$2")
    .replace(/(\*\*|__|\*|_|~~)/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function registerFont() {
  if (fontRegistered) return;
  Font.register({ family: fontFamily, src: "/fonts/NotoSerifBengali.ttf" });
  fontRegistered = true;
}
