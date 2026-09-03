import { sanitizeRemoteImageUrl } from "@/lib/markdown";

const coverWidth = 480;
const coverHeight = 720;
const coverQuality = 0.82;
const maxGeneratedCoverLength = 450_000;

export const generatedBookCoverDataUrlPrefix = "data:image/jpeg;base64,";

const coverPatterns = ["orbits", "rays", "arches", "lines"] as const;

const coverPalettes = [
  {
    background: "#17243A",
    backgroundEnd: "#263B5B",
    accent: "#E9A66D",
    surface: "#7896B7",
    text: "#FFF8ED",
    mutedText: "#D8E0EA",
  },
  {
    background: "#412A36",
    backgroundEnd: "#724151",
    accent: "#F4C67C",
    surface: "#B97881",
    text: "#FFF7EC",
    mutedText: "#F0D8D6",
  },
  {
    background: "#173D35",
    backgroundEnd: "#2D6252",
    accent: "#E5C46B",
    surface: "#70A28F",
    text: "#FFF9E9",
    mutedText: "#D6E8E0",
  },
  {
    background: "#3D3427",
    backgroundEnd: "#67543A",
    accent: "#E7885B",
    surface: "#BAA37C",
    text: "#FFF9ED",
    mutedText: "#E8DDCA",
  },
  {
    background: "#29263E",
    backgroundEnd: "#4D476C",
    accent: "#E8A8C5",
    surface: "#8C82B0",
    text: "#FFF8FC",
    mutedText: "#DED9EC",
  },
  {
    background: "#213237",
    backgroundEnd: "#3C5558",
    accent: "#E5B36B",
    surface: "#7E9B9A",
    text: "#FFF9EE",
    mutedText: "#D9E4E2",
  },
] as const;

type CoverPattern = (typeof coverPatterns)[number];
type CoverPalette = (typeof coverPalettes)[number];

export type BookCoverGeneratorInput = {
  title: string;
  author: string;
  genre?: string;
  variation?: string;
};

export type BookCoverDesign = {
  title: string;
  author: string;
  genre: string;
  paletteIndex: number;
  pattern: CoverPattern;
};

type TextMeasurer = (value: string) => number;

function normalizeDisplayText(value: string, fallback: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ") || fallback;
}

function hashText(value: string): number {
  let hash = 2_166_136_261;

  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

export function createBookCoverDesign(input: BookCoverGeneratorInput): BookCoverDesign {
  const title = normalizeDisplayText(input.title, "Untitled book");
  const author = normalizeDisplayText(input.author, "Awthor");
  const genre = normalizeDisplayText(input.genre ?? "", "");
  const variation = input.variation?.trim() ?? "";
  const seed = `${title.toLowerCase()}\n${author.toLowerCase()}\n${genre.toLowerCase()}\n${variation}`;

  return {
    title,
    author,
    genre,
    paletteIndex: hashText(`${seed}\npalette`) % coverPalettes.length,
    pattern: coverPatterns[hashText(`${seed}\npattern`) % coverPatterns.length],
  };
}

export function wrapBookCoverText(
  value: string,
  maxWidth: number,
  measureText: TextMeasurer,
  maxLines = 4,
): { lines: string[]; truncated: boolean } {
  const words = normalizeDisplayText(value, "Untitled book").split(" ");
  const lines: string[] = [];
  let line = "";

  function pushLine(nextLine: string) {
    if (nextLine && lines.length < maxLines) {
      lines.push(nextLine);
    }
  }

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measureText(candidate) <= maxWidth) {
      line = candidate;
      continue;
    }

    pushLine(line);
    line = "";
    if (lines.length === maxLines) {
      break;
    }

    if (measureText(word) <= maxWidth) {
      line = word;
      continue;
    }

    let segment = "";
    for (const character of Array.from(word)) {
      const nextSegment = `${segment}${character}`;
      if (segment && measureText(nextSegment) > maxWidth) {
        pushLine(segment);
        segment = character;
        if (lines.length === maxLines) {
          break;
        }
      } else {
        segment = nextSegment;
      }
    }
    line = lines.length < maxLines ? segment : "";
  }

  pushLine(line);
  const normalizedValue = words.join(" ");
  const renderedValue = lines.join(" ");
  const truncated = renderedValue !== normalizedValue;

  if (truncated && lines.length > 0) {
    let finalLine = lines.at(-1) ?? "";
    while (finalLine && measureText(`${finalLine}…`) > maxWidth) {
      finalLine = Array.from(finalLine).slice(0, -1).join("");
    }
    lines[lines.length - 1] = `${finalLine.trimEnd()}…`;
  }

  return { lines, truncated };
}

export function isGeneratedBookCoverDataUrl(value: string | null | undefined): value is string {
  if (
    !value ||
    value.length > maxGeneratedCoverLength ||
    !value.startsWith(generatedBookCoverDataUrlPrefix)
  ) {
    return false;
  }

  const payload = value.slice(generatedBookCoverDataUrlPrefix.length);
  return payload.length > 0 && /^[A-Za-z\d+/]+={0,2}$/u.test(payload);
}

export function sanitizeBookCoverUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return isGeneratedBookCoverDataUrl(trimmed) ? trimmed : sanitizeRemoteImageUrl(trimmed);
}

function coverFontFamily(variableName: string, fallback: string): string {
  const configured = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
  return configured || fallback;
}

function drawPattern(
  context: CanvasRenderingContext2D,
  pattern: CoverPattern,
  palette: CoverPalette,
) {
  context.save();

  if (pattern === "orbits") {
    context.strokeStyle = palette.surface;
    context.lineWidth = 3;
    context.globalAlpha = 0.65;
    for (const radius of [150, 215, 280]) {
      context.beginPath();
      context.arc(410, 165, radius, 0, Math.PI * 2);
      context.stroke();
    }
    context.globalAlpha = 1;
    context.fillStyle = palette.accent;
    context.beginPath();
    context.arc(392, 140, 33, 0, Math.PI * 2);
    context.fill();
  }

  if (pattern === "rays") {
    context.translate(365, 128);
    for (let index = 0; index < 8; index += 1) {
      context.rotate(Math.PI / 4);
      context.fillStyle = index % 2 === 0 ? palette.surface : palette.accent;
      context.globalAlpha = index % 2 === 0 ? 0.48 : 0.82;
      context.fillRect(-9, 30, 18, 245);
    }
  }

  if (pattern === "arches") {
    context.globalAlpha = 0.82;
    context.fillStyle = palette.surface;
    context.beginPath();
    context.arc(90, 215, 180, Math.PI, 0);
    context.lineTo(270, 325);
    context.lineTo(-90, 325);
    context.closePath();
    context.fill();
    context.globalAlpha = 1;
    context.fillStyle = palette.accent;
    context.beginPath();
    context.arc(90, 215, 74, Math.PI, 0);
    context.lineTo(164, 273);
    context.lineTo(16, 273);
    context.closePath();
    context.fill();
  }

  if (pattern === "lines") {
    context.strokeStyle = palette.surface;
    context.lineWidth = 2;
    context.globalAlpha = 0.6;
    for (let offset = -240; offset < 600; offset += 38) {
      context.beginPath();
      context.moveTo(offset, 0);
      context.lineTo(offset + 360, 360);
      context.stroke();
    }
    context.globalAlpha = 1;
    context.fillStyle = palette.accent;
    context.fillRect(348, 92, 58, 58);
  }

  context.restore();
}

function drawCoverText(
  context: CanvasRenderingContext2D,
  design: BookCoverDesign,
  palette: CoverPalette,
) {
  const headingFont = coverFontFamily("--font-outfit", "Arial, sans-serif");
  const bodyFont = coverFontFamily("--font-nunito", "Arial, sans-serif");
  const maxTextWidth = coverWidth - 96;
  const candidateFontSizes = [58, 52, 46, 40, 36];
  let titleFontSize = candidateFontSizes.at(-1) ?? 36;
  let titleLines: string[] = [];

  for (const fontSize of candidateFontSizes) {
    context.font = `700 ${fontSize}px ${headingFont}`;
    const wrapped = wrapBookCoverText(
      design.title,
      maxTextWidth,
      (value) => context.measureText(value).width,
      4,
    );
    titleFontSize = fontSize;
    titleLines = wrapped.lines;
    if (!wrapped.truncated && wrapped.lines.length <= 3) {
      break;
    }
  }

  const lineHeight = titleFontSize * 0.98;
  const titleBottom = 625;
  const titleTop = titleBottom - lineHeight * titleLines.length;

  context.fillStyle = palette.text;
  context.font = `700 ${titleFontSize}px ${headingFont}`;
  context.textBaseline = "top";
  for (const [index, line] of titleLines.entries()) {
    context.fillText(line, 48, titleTop + index * lineHeight, maxTextWidth);
  }

  context.fillStyle = palette.accent;
  context.fillRect(48, 646, 38, 4);
  context.fillStyle = palette.mutedText;
  context.font = `700 17px ${bodyFont}`;
  context.fillText(design.author.toUpperCase(), 48, 669, maxTextWidth);
}

export async function generateBookCoverDataUrl(input: BookCoverGeneratorInput): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("Book covers can only be generated in a browser.");
  }

  await document.fonts?.ready;

  const canvas = document.createElement("canvas");
  canvas.width = coverWidth;
  canvas.height = coverHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("This browser could not prepare the book cover.");
  }

  const design = createBookCoverDesign(input);
  const palette = coverPalettes[design.paletteIndex];
  const background = context.createLinearGradient(0, 0, coverWidth, coverHeight);
  background.addColorStop(0, palette.background);
  background.addColorStop(1, palette.backgroundEnd);
  context.fillStyle = background;
  context.fillRect(0, 0, coverWidth, coverHeight);

  drawPattern(context, design.pattern, palette);
  drawCoverText(context, design, palette);

  const dataUrl = canvas.toDataURL("image/jpeg", coverQuality);
  if (!isGeneratedBookCoverDataUrl(dataUrl)) {
    throw new Error("This browser could not finish the book cover.");
  }

  return dataUrl;
}
