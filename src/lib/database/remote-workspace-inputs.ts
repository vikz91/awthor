import { randomUUID } from "node:crypto";
import { z } from "zod";
import { countManuscript, getLeadingMarkdownTitle } from "@/lib/markdown";
import { bookSchema, chapterSchema, createDefaultChapterArc } from "@/lib/repository";

const titleSchema = z.string().trim().min(1).max(200);
const markdownSchema = z.string().max(2_000_000);
const remoteUrlSchema = z
  .string()
  .url()
  .max(2_000)
  .refine((value) => value.startsWith("https://") || value.startsWith("http://"), {
    message: "Only HTTP(S) URLs are supported.",
  });
const remoteCharacterFields = {
  arc: z.string().max(10_000).optional(),
  characteristics: z.array(z.string().max(500)).max(100).optional(),
  dob: z.string().max(100).optional(),
  hidden: z.boolean().optional(),
  image: remoteUrlSchema.or(z.literal("")).optional(),
  language: z.string().max(200).optional(),
  location: z.string().max(500).optional(),
  mentalDescription: z.string().max(10_000).optional(),
  name: titleSchema.optional(),
  physicalDescription: z.string().max(10_000).optional(),
  relationships: z.string().max(10_000).optional(),
  storyRole: z.string().max(500).optional(),
} as const;
export const remoteCreateCharacterSchema = z
  .object({ ...remoteCharacterFields, name: titleSchema })
  .strict();
export const remoteUpdateCharacterSchema = z.object(remoteCharacterFields).strict();
export const remoteCreateBookSchema = z.object({
  author: z.string().trim().max(200).default(""),
  coverUrl: remoteUrlSchema.nullable().optional(),
  seriesName: z.string().trim().max(200).optional(),
  title: titleSchema,
});
export const remoteCreateChapterSchema = z.object({
  body: markdownSchema.default(""),
  title: titleSchema.optional(),
});
export const remoteUpdateBookSchema = remoteCreateBookSchema
  .partial()
  .omit({ title: true })
  .extend({ title: titleSchema.optional() });
export const remoteUpdateChapterSchema = z.object({
  arc: z
    .object({
      conflict: z.string().max(10_000).default(""),
      goal: z.string().max(10_000).default(""),
      outcome: z.string().max(10_000).default(""),
      stage: z.enum([
        "Unassigned",
        "Setup",
        "Rising action",
        "Midpoint",
        "Escalation",
        "Climax",
        "Resolution",
      ]),
      tension: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    })
    .partial()
    .optional(),
  body: markdownSchema.optional(),
  pov: z.string().max(500).optional(),
  status: z.enum(["Draft", "Revision", "Complete"]).optional(),
  summary: z.string().max(10_000).optional(),
  title: titleSchema.optional(),
});

function timestamp() {
  return new Date().toISOString();
}
function counts(body: string) {
  const { characterCount, characterCountWithSpaces, wordCount } = countManuscript(body);
  return { characterCount, characterCountWithSpaces, wordCount };
}

export function createRemoteBookWithInitialChapter(input: unknown) {
  const parsed = remoteCreateBookSchema.parse(input);
  const now = timestamp();
  const book = bookSchema.parse({
    author: parsed.author,
    chapterCount: 1,
    characterCount: 0,
    characterCountWithSpaces: 0,
    coverUrl: parsed.coverUrl ?? null,
    createdAt: now,
    id: randomUUID(),
    isPartOfSeries: Boolean(parsed.seriesName),
    pageCount: 0,
    seriesName: parsed.seriesName ?? "",
    seriesPosition: null,
    title: parsed.title,
    updatedAt: now,
    wordCount: 0,
  });
  const initialChapter = chapterSchema.parse({
    arc: createDefaultChapterArc(),
    body: "",
    createdAt: now,
    id: randomUUID(),
    number: 1,
    title: "Chapter 1",
    updatedAt: now,
    ...counts(""),
  });
  return { book, initialChapter };
}

export function createRemoteChapter(number: number, input: unknown) {
  const parsed = remoteCreateChapterSchema.parse(input);
  const now = timestamp();
  return chapterSchema.parse({
    arc: createDefaultChapterArc(),
    body: parsed.body,
    createdAt: now,
    id: randomUUID(),
    number,
    title: parsed.title ?? getLeadingMarkdownTitle(parsed.body) ?? `Chapter ${number}`,
    updatedAt: now,
    ...counts(parsed.body),
  });
}

export function manuscriptCounts(body: string) {
  return counts(body);
}
