import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MarkdownManuscript } from "@/app/books/[bookId]/markdown-manuscript";
import { getAwthorDatabase } from "@/lib/database/mongodb";
import { getPublishedStoryByPublicId } from "@/lib/database/published-stories";
import { withoutLeadingMarkdownTitle } from "@/lib/markdown";

type StoryPageProps = {
  params: Promise<{ publicId: string }>;
};

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { publicId } = await params;
  const story = await getStory(publicId);

  if (!story) return { robots: { index: false, follow: false } };

  return {
    description:
      story.book.subtitle ||
      `Read ${story.book.title} by ${story.book.author || "an Awthor writer"}.`,
    robots: { index: false, follow: false },
    title: story.book.title,
  };
}

export default async function PublicStoryPage({ params }: StoryPageProps) {
  const { publicId } = await params;
  const story = await getStory(publicId);
  if (!story) notFound();
  const series =
    story.book.isPartOfSeries && story.book.seriesName.trim()
      ? `${story.book.seriesName}${story.book.seriesPosition ? ` · Book ${story.book.seriesPosition}` : ""}`
      : null;

  return (
    <main className="min-h-dvh bg-background px-5 py-14 text-foreground sm:px-8 sm:py-20">
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-border pb-12 text-center">
          {story.book.coverUrl ? (
            <Image
              alt={`Cover of ${story.book.title}`}
              className="mx-auto mb-8 aspect-[2/3] w-32 rounded-lg border border-border object-cover shadow-sm sm:w-40"
              height={480}
              loading="eager"
              referrerPolicy="no-referrer"
              src={story.book.coverUrl}
              unoptimized
              width={320}
            />
          ) : null}
          <p className="text-sm tracking-[0.24em] text-muted-foreground uppercase">
            An Awthor story
          </p>
          {series ? (
            <p className="mt-5 text-sm tracking-[0.18em] text-muted-foreground uppercase">
              {series}
            </p>
          ) : null}
          <h1 className="mt-5 font-serif text-4xl leading-tight font-medium tracking-[-0.03em] sm:text-6xl">
            {story.book.title}
          </h1>
          {story.book.subtitle ? (
            <p className="mt-4 font-serif text-xl leading-8 text-muted-foreground">
              {story.book.subtitle}
            </p>
          ) : null}
          {story.authorName ? (
            <p className="mt-6 text-sm text-muted-foreground">by {story.authorName}</p>
          ) : null}
          {story.authorEmail ? (
            <a
              className="mt-2 inline-block text-sm text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              href={`mailto:${story.authorEmail}`}
            >
              {story.authorEmail}
            </a>
          ) : null}
        </header>

        <div className="divide-y divide-border">
          {story.chapters.map((chapter) => (
            <section className="py-12 sm:py-16" key={chapter.id}>
              <p className="text-sm tracking-[0.2em] text-muted-foreground uppercase">
                Chapter {chapter.number}
              </p>
              {chapter.title.trim() !== story.book.title.trim() ? (
                <h2 className="mt-4 font-serif text-3xl leading-tight font-medium tracking-[-0.025em] sm:text-4xl">
                  {chapter.title}
                </h2>
              ) : null}
              <div className="mt-8 font-serif text-lg sm:text-xl">
                <MarkdownManuscript source={withoutLeadingMarkdownTitle(chapter.body)} />
              </div>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}

async function getStory(publicId: string) {
  try {
    return await getPublishedStoryByPublicId(await getAwthorDatabase(), publicId);
  } catch {
    return null;
  }
}
