import { ArrowRight, BookOpen, House } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function PublishedStoryNotFound() {
  return (
    <div className="awthor-landing relative isolate min-h-dvh overflow-hidden bg-background text-foreground">
      <div aria-hidden="true" className="landing-grain" />

      <header className="relative z-10 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-18 w-full max-w-[90rem] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link
            className="group flex items-center gap-2.5 font-heading text-xl font-semibold tracking-tight focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            href="/"
          >
            <BrandMark className="transition-transform duration-300 group-hover:-rotate-6" />
            awthor
          </Link>
          <p className="font-mono text-[0.68rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Published stories
          </p>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100dvh-4.5rem)] w-full max-w-[90rem] items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(20rem,0.78fr)_minmax(0,1.22fr)] lg:gap-24 lg:px-12 lg:py-24">
        <div aria-hidden="true" className="relative mx-auto w-full max-w-sm lg:max-w-md">
          <p className="absolute -top-9 -left-1 z-0 font-serif text-[clamp(7rem,24vw,13rem)] leading-none font-medium tracking-[-0.08em] text-muted/70 lg:-top-16 lg:-left-12">
            404
          </p>
          <div className="absolute inset-8 translate-x-5 rotate-3 rounded-sm border border-border bg-muted/70 shadow-sm" />
          <div className="relative z-10 mx-5 flex aspect-[4/5] -rotate-2 flex-col rounded-sm border border-border bg-card p-7 shadow-xl shadow-foreground/5 transition-transform duration-500 hover:rotate-0 motion-reduce:transition-none sm:p-9">
            <div className="flex items-center justify-between border-b border-border pb-4 font-mono text-[0.62rem] font-semibold tracking-[0.13em] text-muted-foreground uppercase">
              <span>Awthor edition</span>
              <span>Page missing</span>
            </div>
            <div className="grid flex-1 place-items-center text-center">
              <div>
                <span className="mx-auto grid size-16 place-items-center rounded-full border border-border bg-muted text-primary sm:size-20">
                  <BookOpen aria-hidden="true" className="size-7 sm:size-9" strokeWidth={1.5} />
                </span>
                <p className="mt-6 font-serif text-2xl leading-tight font-medium sm:text-3xl">
                  The last page has turned.
                </p>
              </div>
            </div>
            <div className="space-y-2 border-t border-border pt-5">
              <span className="block h-px w-full bg-border" />
              <span className="block h-px w-3/4 bg-border" />
              <span className="block h-px w-1/2 bg-border" />
            </div>
          </div>
        </div>

        <section className="max-w-3xl lg:pr-10">
          <p className="font-mono text-xs font-bold tracking-[0.18em] text-primary uppercase">
            404 · Story unavailable
          </p>
          <h1 className="mt-5 text-balance font-serif text-5xl leading-[0.92] font-medium tracking-[-0.05em] sm:text-7xl lg:text-8xl">
            This story is no longer on the shelf.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            The author may have unpublished it, or the story may have been removed. Either way,
            there is no longer a published story at this address.
          </p>

          <Link
            className="group mt-9 inline-flex min-h-13 items-center justify-center gap-3 rounded-sm border border-foreground bg-foreground px-5 text-sm font-extrabold text-background transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            href="/"
          >
            <House aria-hidden="true" className="size-4" />
            Go to Awthor home
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
            />
          </Link>

          <p className="mt-7 max-w-lg border-l border-border pl-4 text-sm leading-6 text-muted-foreground">
            Looking for another story? Return home and follow a fresh story link from its author.
          </p>
        </section>
      </main>
    </div>
  );
}
