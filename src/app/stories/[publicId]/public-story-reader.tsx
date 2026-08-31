"use client";

import { Expand, Files, Rows3, Shrink } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MarkdownManuscript } from "@/app/books/[bookId]/markdown-manuscript";
import { PagedManuscript } from "@/app/books/[bookId]/paged-manuscript";
import { Button } from "@/components/ui/button";
import type { PublishedStory } from "@/lib/database/published-story-snapshot";
import { countManuscript, withoutLeadingMarkdownTitle } from "@/lib/markdown";
import { cn } from "@/lib/utils";

type PublicStoryReaderProps = {
  story: PublishedStory;
};

type Layout = "pages" | "seamless";

const wordsPerMinute = 238;

export function PublicStoryReader({ story }: PublicStoryReaderProps) {
  const rootRef = useRef<HTMLElement>(null);
  const chapterRefs = useRef<Record<string, HTMLElement | null>>({});
  const [layout, setLayout] = useState<Layout>("seamless");
  const [fullscreen, setFullscreen] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState(story.chapters[0]?.id ?? "");
  const totalWords = useMemo(
    () =>
      story.chapters.reduce((total, chapter) => total + countManuscript(chapter.body).wordCount, 0),
    [story.chapters],
  );
  const minutes = Math.max(1, Math.ceil(totalWords / wordsPerMinute));
  const series =
    story.book.isPartOfSeries && story.book.seriesName.trim()
      ? `${story.book.seriesName}${story.book.seriesPosition ? ` · Book ${story.book.seriesPosition}` : ""}`
      : null;

  const toggleFullscreen = useCallback(async () => {
    const root = rootRef.current;
    if (!root) return;
    try {
      if (document.fullscreenElement === root) {
        await document.exitFullscreen();
      } else if (document.fullscreenEnabled) {
        await root.requestFullscreen();
      } else {
        setFullscreen((current) => !current);
      }
    } catch {
      setFullscreen((current) => !current);
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!fullscreen || document.fullscreenElement === rootRef.current) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  useEffect(() => {
    const chapters = story.chapters
      .map((chapter) => chapterRefs.current[chapter.id])
      .filter((chapter): chapter is HTMLElement => chapter !== null);
    if (chapters.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);
        const next = visible[0]?.target.id;
        if (next) setActiveChapterId(next);
      },
      { rootMargin: "-18% 0px -68%", threshold: 0 },
    );
    for (const chapter of chapters) observer.observe(chapter);
    return () => observer.disconnect();
  }, [story.chapters]);

  function setChapterRef(id: string, element: HTMLElement | null) {
    chapterRefs.current[id] = element;
  }

  function goToChapter(id: string) {
    const target = chapterRefs.current[id];
    if (!target) return;
    setActiveChapterId(id);
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <main
      className={cn(
        "min-h-dvh bg-background text-foreground",
        fullscreen && "h-dvh overflow-y-auto px-5 py-10 sm:px-8 sm:py-14",
      )}
      ref={rootRef}
    >
      <div className={cn(!fullscreen && "px-5 py-14 sm:px-8 sm:py-20")}>
        <article className="mx-auto max-w-3xl">
          <header className="border-b border-border pb-12 text-center">
            <div className="mb-8 flex items-center justify-center gap-1">
              <Button
                aria-pressed={layout === "seamless"}
                onClick={() => setLayout("seamless")}
                size="sm"
                title="Use seamless reading layout"
                variant={layout === "seamless" ? "secondary" : "ghost"}
              >
                <Rows3 aria-hidden="true" />
                Seamless
              </Button>
              <Button
                aria-pressed={layout === "pages"}
                onClick={() => setLayout("pages")}
                size="sm"
                title="Use page reading layout"
                variant={layout === "pages" ? "secondary" : "ghost"}
              >
                <Files aria-hidden="true" />
                Pages
              </Button>
              <Button
                aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
                onClick={() => void toggleFullscreen()}
                size="icon-sm"
                title={fullscreen ? "Exit full screen" : "Enter full screen"}
                variant="ghost"
              >
                {fullscreen ? <Shrink aria-hidden="true" /> : <Expand aria-hidden="true" />}
              </Button>
            </div>
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
            <p className="mt-5 text-sm tabular-nums text-muted-foreground">
              {totalWords.toLocaleString()} {totalWords === 1 ? "word" : "words"} · About {minutes}{" "}
              min to finish
            </p>
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
            {story.chapters.map((chapter) => {
              const showTitle = chapter.title.trim() !== story.book.title.trim();
              return (
                <section
                  className="scroll-mt-8 py-12 sm:py-16"
                  id={chapter.id}
                  key={chapter.id}
                  ref={(element) => setChapterRef(chapter.id, element)}
                >
                  {layout === "pages" ? (
                    <PagedManuscript
                      chapterLabel={`Chapter ${chapter.number}`}
                      showTitle={showTitle}
                      source={withoutLeadingMarkdownTitle(chapter.body)}
                      title={chapter.title}
                    />
                  ) : (
                    <>
                      <p className="text-sm tracking-[0.2em] text-muted-foreground uppercase">
                        Chapter {chapter.number}
                      </p>
                      {showTitle ? (
                        <h2 className="mt-4 font-serif text-3xl leading-tight font-medium tracking-[-0.025em] sm:text-4xl">
                          {chapter.title}
                        </h2>
                      ) : null}
                      <div className="mt-8 font-serif text-lg sm:text-xl">
                        <MarkdownManuscript source={withoutLeadingMarkdownTitle(chapter.body)} />
                      </div>
                    </>
                  )}
                </section>
              );
            })}
          </div>
        </article>
      </div>

      <nav
        aria-label="Jump to a chapter"
        className="fixed top-1/2 right-1.5 z-30 -translate-y-1/2 opacity-55 transition-opacity hover:opacity-100 focus-within:opacity-100 motion-reduce:transition-none sm:right-4 lg:opacity-45 xl:right-7"
      >
        <ol className="relative flex max-h-[55dvh] flex-col items-center overflow-y-auto py-1 [scrollbar-width:none] before:absolute before:top-4 before:bottom-4 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border before:content-[''] [&::-webkit-scrollbar]:hidden">
          {story.chapters.map((chapter) => {
            const isActive = chapter.id === activeChapterId;
            return (
              <li key={chapter.id}>
                <button
                  aria-current={isActive ? "location" : undefined}
                  aria-label={`Go to Chapter ${chapter.number}: ${chapter.title}`}
                  className="group relative grid size-6 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring sm:size-7"
                  onClick={() => goToChapter(chapter.id)}
                  title={`Chapter ${chapter.number}: ${chapter.title}`}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative z-10 w-1.5 rounded-full border border-background bg-muted-foreground transition-[height,background-color] motion-reduce:transition-none",
                      isActive ? "h-4 bg-primary" : "h-1.5 group-hover:bg-foreground",
                    )}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-7 hidden w-52 -translate-y-1/2 truncate rounded-md border border-border bg-popover px-2 py-1 text-left text-[0.65rem] font-medium text-popover-foreground shadow-md group-hover:block group-focus-visible:block">
                    Chapter {chapter.number}: {chapter.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </main>
  );
}
