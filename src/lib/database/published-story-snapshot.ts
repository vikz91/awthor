import { z } from "zod";
import { type Book, bookSchema, type Chapter, chapterSchema } from "@/lib/repository";

export const publicIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{16,128}$/);

export const publishedStorySchema = z.object({
  book: bookSchema,
  bookId: z.string().min(1),
  chapters: chapterSchema.array(),
  publicId: publicIdSchema,
  publishedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  userId: z.string().min(1),
});
export type PublishedStory = z.infer<typeof publishedStorySchema>;

export function buildPublishedStory(input: {
  book: Book;
  chapters: readonly Chapter[];
  now: string;
  publicId: string;
  userId: string;
  existingPublishedAt?: string;
}): PublishedStory {
  return publishedStorySchema.parse({
    book: input.book,
    bookId: input.book.id,
    chapters: [...input.chapters].sort((left, right) => left.number - right.number),
    publicId: input.publicId,
    publishedAt: input.existingPublishedAt ?? input.now,
    updatedAt: input.now,
    userId: input.userId,
  });
}
