import type { Metadata } from "next";
import { ChapterWorkspace } from "./chapter-workspace";

const books: Record<
  string,
  {
    title: string;
    chapterCount: number;
    wordCount: number;
    targetWords: number;
    currentChapterTitle: string;
    currentExcerpt: string;
  }
> = {
  "the-long-way-home": {
    title: "The Long Way Home",
    chapterCount: 12,
    wordCount: 42680,
    targetWords: 80000,
    currentChapterTitle: "The road at dusk",
    currentExcerpt:
      "By dusk, the road had disappeared beneath the snow. Mara watched the last county truck turn back toward Stillwater and understood that leaving would have to wait.",
  },
  "saltwater-static": {
    title: "Saltwater Static",
    chapterCount: 6,
    wordCount: 18240,
    targetWords: 65000,
    currentChapterTitle: "Voices under weather",
    currentExcerpt:
      "The receiver clicked awake at 2:13 in the morning. Beneath the weather report, a second voice counted backward from the year Nora's sister vanished.",
  },
  "paper-moons": {
    title: "Paper Moons",
    chapterCount: 22,
    wordCount: 71010,
    targetWords: 75000,
    currentChapterTitle: "The letter dated tomorrow",
    currentExcerpt:
      "Theo turned the envelope over twice before opening it. June's handwriting was unmistakable, but the postmark belonged to a day that had not happened yet.",
  },
  "wildlight-orchard": {
    title: "Wildlight Orchard",
    chapterCount: 3,
    wordCount: 4890,
    targetWords: 90000,
    currentChapterTitle: "A memory in the roots",
    currentExcerpt:
      "Lio pressed a palm to the bark and tasted iron, rain, and someone else's fear. The orchard had shown memories before, but never a death.",
  },
};

type ChaptersPageProps = {
  params: Promise<{ bookId: string }>;
};

export async function generateMetadata({ params }: ChaptersPageProps): Promise<Metadata> {
  const { bookId } = await params;
  const bookTitle = books[bookId]?.title ?? "Untitled book";

  return {
    title: "Chapters · " + bookTitle,
    description: "Organize and draft the chapters of " + bookTitle + ".",
  };
}

export default async function ChaptersPage({ params }: ChaptersPageProps) {
  const { bookId } = await params;
  const book = books[bookId] ?? {
    title: "Untitled book",
    chapterCount: 1,
    wordCount: 0,
    targetWords: 80000,
    currentChapterTitle: "Untitled chapter",
    currentExcerpt: "",
  };

  return <ChapterWorkspace bookId={bookId} {...book} />;
}
