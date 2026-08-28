export const manuscriptPageWordCount = 250;

export type ManuscriptCounts = {
  wordCount: number;
  pageCount: number;
  characterCount: number;
  characterCountWithSpaces: number;
};

export type MarkdownSelectionFormat = "bold" | "italic" | "strikethrough" | "quote";

export type MarkdownSelectionResult = {
  source: string;
  selectionStart: number;
  selectionEnd: number;
};

const whitespacePattern = /\s/u;
const wordPattern = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const leadingMarkdownTitlePattern = /^\s*#\s+([^\r\n]*)(?:\r?\n)?/u;

export function getLeadingMarkdownTitle(source: string): string | null {
  const title = source.match(leadingMarkdownTitlePattern)?.[1]?.trim();
  return title || null;
}

export function withoutLeadingMarkdownTitle(source: string): string {
  return source.replace(leadingMarkdownTitlePattern, "").trimStart();
}

export function withLeadingMarkdownTitle(source: string, title: string): string {
  const normalizedTitle = title.trim() || "Untitled chapter";
  const body = withoutLeadingMarkdownTitle(source);
  return body ? `# ${normalizedTitle}\n\n${body}` : `# ${normalizedTitle}\n`;
}

/** Counts the source exactly as it is stored, including Markdown punctuation. */
export function countManuscript(source: string): ManuscriptCounts {
  const words = source.match(wordPattern) ?? [];
  let characterCount = 0;

  for (const character of source) {
    if (!whitespacePattern.test(character)) {
      characterCount += 1;
    }
  }

  return {
    wordCount: words.length,
    pageCount: words.length === 0 ? 0 : Math.ceil(words.length / manuscriptPageWordCount),
    characterCount,
    characterCountWithSpaces: source.length,
  };
}

export type MarkdownUrlKind = "image" | "link";

const safeLinkProtocols = new Set(["http:", "https:", "mailto:"]);
const safeImageProtocols = new Set(["http:", "https:"]);
const explicitProtocolPattern = /^[a-z][a-z\d+.-]*:/iu;

function hasControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

/**
 * Keeps renderer URL handling independent from React Markdown.
 * Relative links are accepted for links, while images must use a remote HTTP(S) URL.
 */
export function sanitizeMarkdownUrl(value: string, kind: MarkdownUrlKind): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (kind === "link") {
    if (hasControlCharacter(trimmed) || trimmed.includes("\\")) {
      return null;
    }

    const isLocalTarget =
      !explicitProtocolPattern.test(trimmed) &&
      !trimmed.startsWith("//") &&
      (trimmed.startsWith("/") ||
        trimmed.startsWith("#") ||
        trimmed.startsWith("?") ||
        trimmed.startsWith("./") ||
        trimmed.startsWith("../") ||
        !trimmed.startsWith("/"));

    if (isLocalTarget) {
      return trimmed;
    }
  }

  try {
    const url = new URL(trimmed);
    const protocols = kind === "image" ? safeImageProtocols : safeLinkProtocols;
    return protocols.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function sanitizeRemoteImageUrl(value: string | null | undefined): string | null {
  return value ? sanitizeMarkdownUrl(value, "image") : null;
}

/** Stable, color-agnostic variant used by token-based generated covers. */
export function generatedCoverVariant(bookId: string, variantCount = 6): number {
  if (!Number.isInteger(variantCount) || variantCount < 1) {
    throw new RangeError("variantCount must be a positive integer.");
  }

  let hash = 2_166_136_261;

  for (const character of bookId) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }

  return (hash >>> 0) % variantCount;
}

/** Applies or removes a Markdown format while preserving a useful selection. */
export function formatMarkdownSelection(
  source: string,
  selectionStart: number,
  selectionEnd: number,
  format: MarkdownSelectionFormat,
): MarkdownSelectionResult {
  const start = Math.max(0, Math.min(source.length, Math.min(selectionStart, selectionEnd)));
  const end = Math.max(start, Math.min(source.length, Math.max(selectionStart, selectionEnd)));

  if (start === end) {
    return { source, selectionStart: start, selectionEnd: end };
  }

  if (format === "quote") {
    return formatQuotedLines(source, start, end);
  }

  const marker = format === "bold" ? "**" : format === "strikethrough" ? "~~" : "*";
  const selected = source.slice(start, end);
  const selectedIsWrapped = isSelectionWrapped(selected, format, marker);

  if (selectedIsWrapped) {
    const unwrapped = selected.slice(marker.length, -marker.length);
    return {
      source: `${source.slice(0, start)}${unwrapped}${source.slice(end)}`,
      selectionStart: start,
      selectionEnd: start + unwrapped.length,
    };
  }

  const surroundingIsWrapped = isSelectionSurrounded(source, start, end, format, marker);
  if (surroundingIsWrapped) {
    return {
      source: `${source.slice(0, start - marker.length)}${selected}${source.slice(end + marker.length)}`,
      selectionStart: start - marker.length,
      selectionEnd: end - marker.length,
    };
  }

  return {
    source: `${source.slice(0, start)}${marker}${selected}${marker}${source.slice(end)}`,
    selectionStart: start + marker.length,
    selectionEnd: end + marker.length,
  };
}

function isSelectionWrapped(
  selected: string,
  format: Exclude<MarkdownSelectionFormat, "quote">,
  marker: string,
): boolean {
  if (
    selected.length < marker.length * 2 ||
    !selected.startsWith(marker) ||
    !selected.endsWith(marker)
  ) {
    return false;
  }

  return format !== "italic" || edgeMarkerRun(selected, 0, 1) % 2 === 1;
}

function isSelectionSurrounded(
  source: string,
  start: number,
  end: number,
  format: Exclude<MarkdownSelectionFormat, "quote">,
  marker: string,
): boolean {
  if (
    start < marker.length ||
    source.slice(start - marker.length, start) !== marker ||
    source.slice(end, end + marker.length) !== marker
  ) {
    return false;
  }

  if (format !== "italic") {
    return true;
  }

  const leadingRun = edgeMarkerRun(source, start - 1, -1);
  const trailingRun = edgeMarkerRun(source, end, 1);
  return leadingRun % 2 === 1 && trailingRun % 2 === 1;
}

function edgeMarkerRun(source: string, index: number, direction: -1 | 1): number {
  let count = 0;
  for (let cursor = index; cursor >= 0 && cursor < source.length; cursor += direction) {
    if (source[cursor] !== "*") {
      break;
    }
    count += 1;
  }
  return count;
}

function formatQuotedLines(source: string, start: number, end: number): MarkdownSelectionResult {
  const lineStart = source.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const selectionTail = end > lineStart && source[end - 1] === "\n" ? end - 1 : end;
  const nextLineBreak = source.indexOf("\n", selectionTail);
  const lineEnd = nextLineBreak < 0 ? source.length : nextLineBreak;
  const block = source.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const contentLines = lines.filter((line) => line.trim().length > 0);
  const removeQuote = contentLines.length > 0 && contentLines.every((line) => /^>\s?/u.test(line));
  const replacement = lines
    .map((line) => {
      if (removeQuote) {
        return line.replace(/^>\s?/u, "");
      }
      return line.length > 0 ? `> ${line}` : ">";
    })
    .join("\n");

  return {
    source: `${source.slice(0, lineStart)}${replacement}${source.slice(lineEnd)}`,
    selectionStart: lineStart,
    selectionEnd: lineStart + replacement.length,
  };
}
