import { z } from "zod";
import { type Book, bookSchema, type Chapter, chapterSchema } from "@/lib/repository";

export const publicIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{16,128}$/);

export const publishedStorySchema = z.object({
  authorEmail: z.string().email().or(z.literal("")).default(""),
  authorName: z.string().default(""),
  book: bookSchema,
  bookId: z.string().min(1),
  chapters: chapterSchema.array(),
  publicId: publicIdSchema,
  publishedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  userId: z.string().min(1),
});
export type PublishedStory = z.infer<typeof publishedStorySchema>;

export type PublishedStorySummary = Pick<
  PublishedStory,
  "publicId" | "publishedAt" | "updatedAt"
> & { url: string };

/** The small, non-manuscript payload used to link published books in a series. */
export type PublishedSeriesStory = {
  coverUrl: string | null;
  publicId: string;
  seriesPosition: number | null;
  subtitle: string;
  title: string;
};

/** Intentionally excludes every manuscript-bearing field from the private UI API. */
export function toPublishedStorySummary(story: PublishedStory): PublishedStorySummary {
  return {
    publicId: story.publicId,
    publishedAt: story.publishedAt,
    updatedAt: story.updatedAt,
    url: `/stories/${story.publicId}`,
  };
}

export function toPublishedSeriesStory(story: PublishedStory): PublishedSeriesStory {
  return {
    coverUrl: story.book.coverUrl,
    publicId: story.publicId,
    seriesPosition: story.book.seriesPosition,
    subtitle: story.book.subtitle,
    title: story.book.title,
  };
}

function normalizeAuthorEmail(value: string): string {
  const email = value.trim();
  return z.string().email().safeParse(email).success ? email : "";
}

export function buildPublishedStory(input: {
  authorEmail: string;
  authorName: string;
  book: Book;
  chapters: readonly Chapter[];
  now: string;
  publicId: string;
  userId: string;
  existingPublishedAt?: string;
}): PublishedStory {
  return publishedStorySchema.parse({
    authorEmail: normalizeAuthorEmail(input.authorEmail),
    authorName: input.authorName,
    book: input.book,
    bookId: input.book.id,
    chapters: [...input.chapters].sort((left, right) => left.number - right.number),
    publicId: input.publicId,
    publishedAt: input.existingPublishedAt ?? input.now,
    updatedAt: input.now,
    userId: input.userId,
  });
}
