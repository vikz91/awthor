import type { Chapter } from "@/lib/repository";

export const readingWordsPerMinute = 238;

export type ReadingProgress = {
  percent: number;
  remainingMinutes: number;
};

/**
 * Converts a book's remembered chapter and normalized in-chapter position into
 * a word-weighted reading estimate. Word weighting keeps a short opening
 * chapter from looking like a disproportionate amount of the book.
 */
export function calculateReadingProgress({
  chapters,
  lastChapterId,
  position = 0,
}: {
  chapters: readonly Chapter[];
  lastChapterId?: string;
  position?: number;
}): ReadingProgress {
  const orderedChapters = [...chapters].sort((left, right) => left.number - right.number);
  const totalWords = orderedChapters.reduce((total, chapter) => total + chapter.wordCount, 0);

  if (totalWords <= 0 || !lastChapterId) {
    return { percent: 0, remainingMinutes: Math.ceil(totalWords / readingWordsPerMinute) };
  }

  const chapterIndex = orderedChapters.findIndex((chapter) => chapter.id === lastChapterId);
  if (chapterIndex < 0) {
    return { percent: 0, remainingMinutes: Math.ceil(totalWords / readingWordsPerMinute) };
  }

  const wordsBefore = orderedChapters
    .slice(0, chapterIndex)
    .reduce((total, chapter) => total + chapter.wordCount, 0);
  const currentChapterWords = orderedChapters[chapterIndex].wordCount;
  const normalizedPosition = Math.min(1, Math.max(0, position));
  const percent = Math.round(
    Math.min(
      1,
      Math.max(0, (wordsBefore + currentChapterWords * normalizedPosition) / totalWords),
    ) * 100,
  );
  const remainingMinutes = Math.ceil((totalWords * (1 - percent / 100)) / readingWordsPerMinute);

  return { percent, remainingMinutes };
}
