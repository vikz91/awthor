import {
  ArrowRight,
  BookOpenText,
  Check,
  Cloud,
  Code2,
  ExternalLink,
  FileDown,
  Focus,
  HardDrive,
  MoonStar,
  PenLine,
  ShieldCheck,
  Sparkles,
  SpellCheck2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { SyncAccountAction } from "@/components/sync-account-action";
import { HOME_METADATA, SoftwareApplicationJsonLd } from "@/lib/seo";

export const metadata = HOME_METADATA;

const features = [
  {
    icon: PenLine,
    title: "Write without wrestling the app",
    description:
      "Read, write, format, and focus in the same manuscript view—without navigating away from your chapter.",
  },
  {
    icon: BookOpenText,
    title: "Keep the story close",
    description:
      "Keep characters and chapter arcs close at hand in quiet drawers that never interrupt the draft.",
  },
  {
    icon: SpellCheck2,
    title: "Get feedback without giving up privacy",
    description:
      "Run spelling, grammar, and style checks on-device with Harper.js—your manuscript is never sent away.",
  },
  {
    icon: FileDown,
    title: "Own a portable manuscript",
    description:
      "Download portable Markdown, PDF, or EPUB files, and keep complete local ZIP backups.",
  },
  {
    icon: MoonStar,
    title: "Made to live in for hours",
    description:
      "Choose warm Paper or low-glare Stone, then switch between seamless and page layouts as you write.",
  },
  {
    icon: Cloud,
    title: "Sync only when it helps",
    description:
      "Write without an account. When you choose Sync, your signed-in library is ready on another device.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground transition-colors">
      <SoftwareApplicationJsonLd />
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
            <a className="transition-colors hover:text-foreground" href="#why-awthor">
              Why Awthor
            </a>
            <a className="transition-colors hover:text-foreground" href="#workspace">
              See Awthor
            </a>
            <a className="transition-colors hover:text-foreground" href="#how-it-works">
              How it works
            </a>
            <a className="transition-colors hover:text-foreground" href="#open-source">
              Open source
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:inline-flex"
              href="https://github.com/vikz91/awthor"
              rel="noreferrer"
              target="_blank"
            >
              <Code2 aria-hidden="true" className="size-4" />
              GitHub
              <ExternalLink aria-hidden="true" className="size-3" />
            </a>
            <SyncAccountAction variant="landing-header" />
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
                Free · Open source · Local-first
              </div>
              <h1 className="text-balance font-heading text-5xl leading-[0.98] font-semibold tracking-[-0.045em] sm:text-6xl lg:text-[4.8rem]">
                A novel workspace that keeps your story yours.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
                Awthor removes the busywork around a long-form draft—without asking you to rent your
                own manuscript. Write locally, keep portable backups, and add sync only when another
                device truly needs it.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-xl shadow-foreground/10 transition hover:-translate-y-0.5 hover:bg-primary/90"
                  href="/books"
                >
                  Start writing freely
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <a
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-border bg-card/60 px-6 text-sm font-bold text-foreground transition hover:border-primary/30 hover:bg-card"
                  href="https://github.com/vikz91/awthor"
                  rel="noreferrer"
                  target="_blank"
                >
                  <Code2 aria-hidden="true" className="size-4" />
                  View on GitHub
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
                <a
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-primary transition hover:bg-primary/10"
                  href="https://github.com/vikz91/awthor"
                  rel="noreferrer"
                  target="_blank"
                >
                  <Sparkles aria-hidden="true" className="size-4" />
                  Star Awthor
                </a>
                <SyncAccountAction variant="landing-hero" />
              </div>

              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Check aria-hidden="true" className="size-4 text-primary" />
                  Free, always
                </span>
                <span className="flex items-center gap-1.5">
                  <Check aria-hidden="true" className="size-4 text-primary" />
                  No account required
                </span>
                <span className="flex items-center gap-1.5">
                  <Check aria-hidden="true" className="size-4 text-primary" />
                  Export whenever you want
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-2xl lg:mx-0">
              <div
                aria-hidden="true"
                className="absolute -inset-5 -z-10 rotate-2 rounded-[2.2rem] bg-primary/10"
              />
              <figure className="overflow-hidden rounded-[1.7rem] border border-border bg-card shadow-2xl shadow-foreground/10">
                <Image
                  alt="Awthor Read mode displaying a chapter from a novel"
                  className="h-auto w-full"
                  height={1024}
                  priority
                  sizes="(min-width: 1024px) 56vw, 100vw"
                  src="/screenshots/awthor-read-mode.jpg"
                  width={1536}
                />
                <figcaption className="flex items-center justify-between gap-4 border-t border-border bg-card px-5 py-4 text-xs font-semibold text-muted-foreground">
                  <span>Read mode · One continuous manuscript</span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-foreground">
                    <HardDrive aria-hidden="true" className="size-3.5" />
                    Saved locally
                  </span>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-muted/50" id="why-awthor">
          <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Why writers choose Awthor
              </p>
              <h2 className="mt-4 text-balance font-heading text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                A focused place to finish the book—not just begin it.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                The app is deliberately small where it should be and capable where a long draft
                needs support. Nothing is locked behind a plan or held hostage in a proprietary
                format.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  className="rounded-[1.5rem] border border-border bg-card p-6 shadow-lg shadow-foreground/5 sm:p-7"
                  key={feature.title}
                >
                  <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <feature.icon aria-hidden="true" className="size-5" />
                  </div>
                  <h3 className="mt-6 font-heading text-xl font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
          id="workspace"
        >
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              The actual workspace
            </p>
            <h2 className="mt-4 text-balance font-heading text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
              Everything your novel needs. Nothing it doesn&apos;t.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              Move from your local library to a book, then shift between reading and Markdown
              writing without waiting for another page to load.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <figure className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-xl shadow-foreground/5">
              <Image
                alt="Awthor library showing locally stored books"
                className="aspect-[3/2] w-full object-cover object-top"
                height={1024}
                sizes="(min-width: 1024px) 34vw, 100vw"
                src="/screenshots/awthor-library-current.jpg"
                width={1536}
              />
              <figcaption className="border-t border-border px-6 py-5">
                <p className="font-heading text-lg font-semibold tracking-tight">A quiet library</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Search, create, sync when you choose, and open books stored privately in this
                  browser.
                </p>
              </figcaption>
            </figure>

            <figure className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-xl shadow-foreground/5">
              <Image
                alt="Awthor local spell check drawer beside a Markdown chapter editor"
                className="aspect-[3/2] w-full object-cover object-top"
                height={1024}
                sizes="(min-width: 1024px) 34vw, 100vw"
                src="/screenshots/awthor-spell-check.jpg"
                width={1536}
              />
              <figcaption className="border-t border-border px-6 py-5">
                <p className="font-heading text-lg font-semibold tracking-tight">
                  Spell check, kept local
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Get useful writing feedback in a drawer without uploading your manuscript.
                </p>
              </figcaption>
            </figure>

            <figure className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-xl shadow-foreground/5">
              <Image
                alt="Awthor chapter chooser with searchable, reorderable chapters"
                className="aspect-[3/2] w-full object-cover object-top"
                height={1024}
                sizes="(min-width: 1024px) 34vw, 100vw"
                src="/screenshots/awthor-chapter-chooser.jpg"
                width={1536}
              />
              <figcaption className="border-t border-border px-6 py-5">
                <p className="font-heading text-lg font-semibold tracking-tight">
                  Structure without the sprawl
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Search, add, rename, reorder, and open chapters without leaving the book.
                </p>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid gap-10 rounded-[2rem] border border-border bg-card p-7 shadow-xl shadow-foreground/5 sm:p-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:p-14">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Small tools, right on time
              </p>
              <h2 className="mt-4 text-balance font-heading text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                The page stays clear until you need more.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
                A discreet bottom tool bar reveals spell check, characters, chapter arc, and live
                counts. Select text to format it in place. The rest of the time, it&apos;s just you
                and the chapter.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-2xl border border-border bg-muted/40 p-5">
                <Focus aria-hidden="true" className="size-5 text-primary" />
                <h3 className="mt-4 font-heading text-lg font-semibold">Focus without friction</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Enter a distraction-free reading or writing space, then leave exactly where you
                  were.
                </p>
              </article>
              <article className="rounded-2xl border border-border bg-muted/40 p-5">
                <HardDrive aria-hidden="true" className="size-5 text-primary" />
                <h3 className="mt-4 font-heading text-lg font-semibold">Backups you control</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Export a portable ZIP whenever you want, with a gentle weekly reminder to keep a
                  copy.
                </p>
              </article>
              <article className="rounded-2xl border border-border bg-muted/40 p-5">
                <Cloud aria-hidden="true" className="size-5 text-primary" />
                <h3 className="mt-4 font-heading text-lg font-semibold">Sync on your terms</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Sign in only if you want multi-device access. Your first explicit Sync is the
                  moment anything leaves this device.
                </p>
              </article>
              <article className="rounded-2xl border border-border bg-muted/40 p-5">
                <Code2 aria-hidden="true" className="size-5 text-primary" />
                <h3 className="mt-4 font-heading text-lg font-semibold">AI tools, on your terms</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Compatible AI browsers can use local page tools; authorized MCP clients can work
                  with the books you have chosen to sync.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section
          className="border-t border-border bg-muted/40 px-5 py-20 text-center sm:px-8 lg:py-28"
          id="how-it-works"
        >
          <div className="mx-auto w-full max-w-4xl">
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
          </div>
        </section>

        <section className="px-5 pb-8 sm:px-8" id="open-source">
          <div className="mx-auto w-full max-w-7xl rounded-[2rem] bg-foreground px-7 py-10 text-background sm:px-10 lg:px-14 lg:py-14">
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-background/70">
                  Free. Open. Yours.
                </p>
                <h2 className="mt-3 max-w-2xl font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                  Your manuscript starts on your computer—not ours.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-background/65 sm:text-base">
                  Awthor is completely free and open source. You can write without an account, and
                  optional sync remains your choice whenever you need another device.
                </p>
              </div>
              <a
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-background px-6 py-3.5 text-sm font-bold text-foreground transition hover:-translate-y-0.5 hover:bg-background/90"
                href="https://github.com/vikz91/awthor"
                rel="noreferrer"
                target="_blank"
              >
                <Code2 aria-hidden="true" className="size-4" />
                Star Awthor on GitHub
                <ExternalLink aria-hidden="true" className="size-4" />
              </a>
            </div>

            <div className="mt-9 grid gap-3 border-t border-background/10 pt-7 sm:grid-cols-3">
              <div className="flex items-center gap-3 text-sm font-bold text-background/80">
                <Code2 aria-hidden="true" className="size-4 text-background/70" />
                Open-source code
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-background/80">
                <HardDrive aria-hidden="true" className="size-4 text-background/70" />
                Local by default
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-background/80">
                <ShieldCheck aria-hidden="true" className="size-4 text-background/70" />
                Optional sync
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
                novel—without needing an account or giving up control of your words.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary">
                <HardDrive aria-hidden="true" className="size-3.5" />
                Local by default
              </div>
            </div>

            <nav aria-label="Explore Awthor">
              <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                Explore
              </h2>
              <ul className="mt-5 space-y-3 text-sm font-semibold text-muted-foreground">
                <li>
                  <Link
                    className="transition-colors hover:text-foreground"
                    href="/open-source-novel-writing-app"
                  >
                    Open-source writing
                  </Link>
                </li>
                <li>
                  <Link
                    className="transition-colors hover:text-foreground"
                    href="/private-local-first-writing-app"
                  >
                    Private, local-first writing
                  </Link>
                </li>
                <li>
                  <Link
                    className="transition-colors hover:text-foreground"
                    href="/scrivener-alternative"
                  >
                    Scrivener comparison
                  </Link>
                </li>
                <li>
                  <a className="transition-colors hover:text-foreground" href="#why-awthor">
                    Why Awthor
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-foreground" href="#workspace">
                    See Awthor
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
                    href="https://github.com/vikz91/awthor"
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Code2 aria-hidden="true" className="size-4" />
                    Star Awthor
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
