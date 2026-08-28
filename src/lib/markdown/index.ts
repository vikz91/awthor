export const manuscriptPageWordCount = 250;

export type ManuscriptCounts = {
  wordCount: number;
  pageCount: number;
  characterCount: number;
  characterCountWithSpaces: number;
};

const whitespacePattern = /\s/u;
const wordPattern = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

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
