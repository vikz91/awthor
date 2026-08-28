import {
  ArrowRight,
  BookOpenText,
  Check,
  Code2,
  ExternalLink,
  Feather,
  Focus,
  HardDrive,
  MoonStar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

const features = [
  {
    icon: Focus,
    title: "A focused writing room",
    description:
      "Read and write in one calm manuscript view, with no dashboards or page changes in the way.",
  },
  {
    icon: BookOpenText,
    title: "Your whole story, organized",
    description:
      "Move from book to chapter without losing the thread. Everything stays tidy as the story grows.",
  },
  {
    icon: MoonStar,
    title: "Comfortable in any light",
    description:
      "Choose warm Paper or low-glare Stone for a comfortable writing space at any hour.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground transition-colors">
      <header className="relative z-20 border-b border-border">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link
            className="flex items-center gap-2.5 font-heading text-xl font-semibold tracking-tight"
            href="/"
          >
            <BrandMark className="shadow-lg shadow-foreground/10" />
            awthor
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-8 text-sm font-semibold text-muted-foreground md:flex"
          >
            <a className="transition-colors hover:text-foreground" href="#features">
              Features
            </a>
            <a className="transition-colors hover:text-foreground" href="#how-it-works">
              How it works
            </a>
            <a className="transition-colors hover:text-foreground" href="#open-source">
              Open source
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
              href="/books"
            >
              Your library
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-foreground/10 transition hover:-translate-y-0.5 hover:bg-primary/90"
              href="/books"
            >
              Start writing
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate">
          <div
            aria-hidden="true"
            className="absolute -top-32 left-1/2 -z-10 h-[620px] w-[960px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
          />

          <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pt-16 pb-20 sm:px-8 sm:pt-24 lg:grid-cols-[0.88fr_1.12fr] lg:gap-20 lg:px-12 lg:pt-28 lg:pb-28">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/65 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-primary backdrop-blur">
                <Sparkles aria-hidden="true" className="size-3.5" />
                Free &amp; open source
              </div>
              <h1 className="text-balance font-heading text-5xl leading-[0.98] font-semibold tracking-[-0.045em] sm:text-6xl lg:text-[4.8rem]">
                Your story deserves a quieter place.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
                Awthor gives novelists a beautifully simple space to plan, write, and finish their
                books—one good writing day at a time.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-xl shadow-foreground/10 transition hover:-translate-y-0.5 hover:bg-primary/90"
                  href="/books"
                >
                  Start your first book
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <a
                  className="inline-flex h-13 items-center justify-center rounded-2xl border border-border bg-card/60 px-6 text-sm font-bold text-foreground transition hover:border-primary/30 hover:bg-card"
                  href="#how-it-works"
                >
                  See how it works
                </a>
              </div>

              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Check aria-hidden="true" className="size-4 text-primary" />
                  Free, always
                </span>
                <span className="flex items-center gap-1.5">
                  <Check aria-hidden="true" className="size-4 text-primary" />
                  Your words stay local
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-2xl lg:mx-0">
              <div
                aria-hidden="true"
                className="absolute -inset-5 -z-10 rotate-2 rounded-[2.2rem] bg-primary/10"
              />
              <div className="overflow-hidden rounded-[1.7rem] border border-border bg-card shadow-2xl shadow-foreground/10">
                <div className="flex items-center justify-between border-b border-border bg-card/70 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-primary" />
                    <span className="size-2.5 rounded-full bg-secondary" />
                    <span className="size-2.5 rounded-full bg-foreground" />
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Saved on this device
                  </span>
                </div>

                <div className="grid min-h-[430px] grid-cols-[132px_1fr] sm:grid-cols-[180px_1fr]">
                  <aside className="border-r border-border bg-muted/50 p-4 sm:p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      The Long Way Home
                    </p>
                    <div className="mt-5 space-y-1.5 text-xs font-semibold text-muted-foreground">
                      <div className="rounded-lg px-2.5 py-2">01 · The Letter</div>
                      <div className="rounded-lg bg-primary/10 px-2.5 py-2 text-primary">
                        02 · Northbound
                      </div>
                      <div className="rounded-lg px-2.5 py-2">03 · A Familiar Face</div>
                      <div className="rounded-lg px-2.5 py-2">04 · The Crossing</div>
                    </div>
                  </aside>

                  <article className="px-6 py-8 sm:px-10 sm:py-10">
                    <div className="mb-8 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                      <span>Chapter two</span>
                      <span>1,247 words</span>
                    </div>
                    <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                      Northbound
                    </h2>
                    <div className="mt-7 space-y-5 font-serif text-[15px] leading-7 text-foreground/80 sm:text-base">
                      <p>
                        The train slipped out of the city before Mara could decide whether leaving
                        counted as courage or surrender.
                      </p>
                      <p>
                        Beyond the glass, morning gathered over the fields in pale ribbons. She
                        opened the letter once more, though by now she knew every word.
                      </p>
                      <p className="text-muted-foreground">
                        At the bottom of the page, her mother&apos;s handwriting leaned gently
                        toward the margin...
                        <span className="ml-0.5 inline-block h-5 w-px translate-y-1 bg-primary" />
                      </p>
                    </div>
                  </article>
                </div>
              </div>

              <div className="absolute -right-1 -bottom-5 flex items-center gap-3 rounded-2xl border border-border bg-popover/90 px-4 py-3 shadow-xl shadow-foreground/10 backdrop-blur sm:-right-5">
                <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Feather aria-hidden="true" className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Today
                  </p>
                  <p className="text-sm font-extrabold text-foreground">682 words written</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-muted/50" id="features">
          <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-16 sm:px-8 md:grid-cols-3 lg:px-12 lg:py-20">
            {features.map((feature) => (
              <article
                className="rounded-[1.5rem] border border-border bg-card p-6 shadow-lg shadow-foreground/5 sm:p-7"
                key={feature.title}
              >
                <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <feature.icon aria-hidden="true" className="size-5" />
                </div>
                <h2 className="mt-6 font-heading text-xl font-semibold tracking-tight">
                  {feature.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="mx-auto w-full max-w-4xl px-5 py-20 text-center sm:px-8 lg:py-28"
          id="how-it-works"
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            From blank page to final chapter
          </p>
          <h2 className="mt-4 text-balance font-heading text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
            Less managing. More writing.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Create a book, break it into chapters, and return each day to the exact place you left
            off. Awthor keeps the process light, your words private, and your story moving.
          </p>
          <Link
            className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-primary transition hover:gap-3"
            href="/books"
          >
            Open your local library
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>

        <section className="px-5 pb-8 sm:px-8" id="open-source">
          <div className="mx-auto w-full max-w-7xl rounded-[2rem] bg-foreground px-7 py-10 text-background sm:px-10 lg:px-14 lg:py-14">
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-background/70">
                  Free. Open. Yours.
                </p>
                <h2 className="mt-3 max-w-2xl font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                  Your manuscript belongs on your computer—not ours.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-background/65 sm:text-base">
                  Awthor is completely free and open source. The hosted app keeps your writing on
                  your device and never stores your manuscript in an Awthor server database.
                </p>
              </div>
              <Link
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-background px-6 py-3.5 text-sm font-bold text-foreground transition hover:-translate-y-0.5 hover:bg-background/90"
                href="/books"
              >
                Open your library
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>

            <div className="mt-9 grid gap-3 border-t border-background/10 pt-7 sm:grid-cols-3">
              <div className="flex items-center gap-3 text-sm font-bold text-background/80">
                <Code2 aria-hidden="true" className="size-4 text-background/70" />
                Open-source code
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-background/80">
                <HardDrive aria-hidden="true" className="size-4 text-background/70" />
                Stored on your device
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-background/80">
                <ShieldCheck aria-hidden="true" className="size-4 text-background/70" />
                No manuscript database
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-8 border-t border-border bg-muted/50">
        <div className="mx-auto w-full max-w-7xl px-5 pt-14 pb-8 sm:px-8 lg:px-12 lg:pt-16">
          <div className="grid gap-12 border-b border-border pb-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.75fr_0.75fr] lg:gap-16">
            <div className="max-w-sm">
              <Link
                className="inline-flex items-center gap-2.5 font-heading text-xl font-semibold tracking-tight text-foreground"
                href="/"
              >
                <BrandMark size={36} />
                awthor
              </Link>
              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                A calm, completely free writing space for planning, drafting, and finishing your
                novel—without giving your manuscript to the cloud.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary">
                <HardDrive aria-hidden="true" className="size-3.5" />
                Your words stay on your device
              </div>
            </div>

            <nav aria-label="Explore Awthor">
              <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                Explore
              </h2>
              <ul className="mt-5 space-y-3 text-sm font-semibold text-muted-foreground">
                <li>
                  <a className="transition-colors hover:text-foreground" href="#features">
                    Features
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-foreground" href="#how-it-works">
                    How it works
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-foreground" href="#open-source">
                    Local-first approach
                  </a>
                </li>
                <li>
                  <Link className="transition-colors hover:text-foreground" href="/books">
                    Your library
                  </Link>
                </li>
              </ul>
            </nav>

            <nav aria-label="Awthor project">
              <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                Project
              </h2>
              <ul className="mt-5 space-y-3 text-sm font-semibold text-muted-foreground">
                <li>
                  <a
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                    href="https://github.com/vikz91/awthor"
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Code2 aria-hidden="true" className="size-4" />
                    Source code
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                </li>
                <li>
                  <a
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                    href="https://github.com/vikz91/awthor/blob/main/LICENSE"
                    rel="noreferrer"
                    target="_blank"
                  >
                    AGPL-3.0 license
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                </li>
                <li>
                  <a
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                    href="https://github.com/vikz91/awthor/issues"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Report an issue
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          <div className="flex flex-col gap-3 pt-7 text-xs font-semibold text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Awthor contributors.</p>
            <p>Free · Open source · Local-first</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
