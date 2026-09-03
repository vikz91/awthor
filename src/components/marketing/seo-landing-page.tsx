import type { LucideIcon } from "lucide-react";
import { ArrowRight, Check, Code2, ExternalLink, HardDrive, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { GITHUB_URL, SoftwareApplicationJsonLd } from "@/lib/seo";

export type MarketingFeature = {
  description: ReactNode;
  icon: LucideIcon;
  title: string;
};

export type MarketingDetail = {
  body: ReactNode[];
  heading: string;
  points?: string[];
};

type Comparison = {
  caption: string;
  columns: [string, string, string];
  heading: string;
  intro: ReactNode;
  rows: Array<[string, ReactNode, ReactNode]>;
};

type Source = {
  href: string;
  label: string;
};

type RelatedPage = {
  description: string;
  href: string;
  label: string;
};

type SeoLandingPageProps = {
  comparison?: Comparison;
  details: MarketingDetail[];
  disclaimer?: ReactNode;
  eyebrow: string;
  features: MarketingFeature[];
  featuresHeading: string;
  featuresIntro: string;
  heroChecks: string[];
  heroImage: {
    alt: string;
    caption: string;
    src: string;
  };
  intro: string;
  relatedPages: RelatedPage[];
  sources?: Source[];
  title: string;
};

export function SeoLandingPage({
  comparison,
  details,
  disclaimer,
  eyebrow,
  features,
  featuresHeading,
  featuresIntro,
  heroChecks,
  heroImage,
  intro,
  relatedPages,
  sources,
  title,
}: SeoLandingPageProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground transition-colors">
      <SoftwareApplicationJsonLd />
      <MarketingHeader />

      <main>
        <section className="relative isolate">
          <div
            aria-hidden="true"
            className="absolute -top-36 left-1/2 -z-10 h-[620px] w-[960px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
          />
          <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pt-16 pb-20 sm:px-8 sm:pt-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-12 lg:pt-28 lg:pb-28">
            <div className="max-w-2xl">
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/65 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-primary backdrop-blur">
                <ShieldCheck aria-hidden="true" className="size-3.5" />
                {eyebrow}
              </p>
              <h1 className="text-balance font-heading text-5xl leading-[0.98] font-semibold tracking-[-0.045em] sm:text-6xl lg:text-[4.55rem]">
                {title}
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
                {intro}
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-xl shadow-foreground/10 transition hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  href="/books"
                >
                  Start writing
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <a
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-border bg-card/60 px-6 text-sm font-bold text-foreground transition hover:border-primary/30 hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  href={GITHUB_URL}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Code2 aria-hidden="true" className="size-4" />
                  View source
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              </div>

              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-muted-foreground">
                {heroChecks.map((item) => (
                  <li className="flex items-center gap-1.5" key={item}>
                    <Check aria-hidden="true" className="size-4 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <figure className="relative mx-auto w-full max-w-2xl lg:mx-0">
              <div
                aria-hidden="true"
                className="absolute -inset-5 -z-10 rotate-2 rounded-[2.2rem] bg-primary/10"
              />
              <div className="overflow-hidden rounded-[1.7rem] border border-border bg-card shadow-2xl shadow-foreground/10">
                <Image
                  alt={heroImage.alt}
                  className="h-auto w-full"
                  height={1024}
                  priority
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  src={heroImage.src}
                  width={1536}
                />
                <figcaption className="flex items-center gap-2 border-t border-border bg-card px-5 py-4 text-xs font-semibold text-muted-foreground">
                  <HardDrive aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
                  {heroImage.caption}
                </figcaption>
              </div>
            </figure>
          </div>
        </section>

        <section className="border-y border-border bg-muted/50">
          <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                What you get
              </p>
              <h2 className="mt-4 text-balance font-heading text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                {featuresHeading}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                {featuresIntro}
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
                  <div className="mt-3 text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid gap-6 lg:grid-cols-2">
            {details.map((detail, index) => (
              <article
                className="rounded-[1.75rem] border border-border bg-card p-7 shadow-xl shadow-foreground/5 sm:p-9"
                key={detail.heading}
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-4 text-balance font-heading text-3xl font-semibold tracking-[-0.025em]">
                  {detail.heading}
                </h2>
                {detail.body.map((paragraph, paragraphIndex) => (
                  <p
                    className="mt-4 text-base leading-7 text-muted-foreground"
                    key={`${detail.heading}-${paragraphIndex}`}
                  >
                    {paragraph}
                  </p>
                ))}
                {detail.points ? (
                  <ul className="mt-5 space-y-3 text-sm leading-6 text-muted-foreground">
                    {detail.points.map((point) => (
                      <li className="flex gap-3" key={point}>
                        <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        {comparison ? <ComparisonTable comparison={comparison} /> : null}

        {disclaimer ? (
          <aside className="mx-auto w-full max-w-7xl px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
            <div className="rounded-2xl border border-border bg-muted/50 px-5 py-4 text-sm leading-6 text-muted-foreground sm:px-6">
              {disclaimer}
            </div>
          </aside>
        ) : null}

        {sources?.length ? (
          <section className="border-t border-border bg-muted/40">
            <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
              <h2 className="font-heading text-xl font-semibold tracking-tight">
                Official sources for this comparison
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Product capabilities can change. These first-party Literature &amp; Latte pages were
                used to verify the Scrivener descriptions above.
              </p>
              <ul className="mt-4 flex flex-wrap gap-3">
                {sources.map((source) => (
                  <li key={source.href}>
                    <a
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      href={source.href}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {source.label}
                      <ExternalLink aria-hidden="true" className="size-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <RelatedPages pages={relatedPages} />

        <section className="px-5 pb-8 sm:px-8">
          <div className="mx-auto w-full max-w-7xl rounded-[2rem] bg-foreground px-7 py-10 text-background sm:px-10 lg:px-14 lg:py-14">
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-background/70">
                  Your next chapter
                </p>
                <h2 className="mt-3 max-w-2xl font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                  Start writing before the setup becomes another project.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-background/65 sm:text-base">
                  Open Awthor in your browser, create a book, and keep the first draft on this
                  device. No account or payment step stands between you and the page.
                </p>
              </div>
              <Link
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-background px-6 py-3.5 text-sm font-bold text-foreground transition hover:-translate-y-0.5 hover:bg-background/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
                href="/books"
              >
                Start writing
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

function MarketingHeader() {
  return (
    <header className="relative z-20 border-b border-border">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link
          className="flex items-center gap-2.5 font-heading text-xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          href="/"
        >
          <BrandMark className="shadow-lg shadow-foreground/10" />
          awthor
        </Link>
        <nav
          aria-label="Explore Awthor"
          className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground lg:flex"
        >
          <Link
            className="transition-colors hover:text-foreground"
            href="/open-source-novel-writing-app"
          >
            Open source
          </Link>
          <Link
            className="transition-colors hover:text-foreground"
            href="/private-local-first-writing-app"
          >
            Privacy
          </Link>
          <Link className="transition-colors hover:text-foreground" href="/scrivener-alternative">
            Compare
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
            href={GITHUB_URL}
            rel="noreferrer"
            target="_blank"
          >
            <Code2 aria-hidden="true" className="size-4" />
            GitHub
            <ExternalLink aria-hidden="true" className="size-3" />
          </a>
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
  );
}

function ComparisonTable({ comparison }: { comparison: Comparison }) {
  return (
    <section className="border-y border-border bg-muted/50">
      <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Side-by-side</p>
          <h2 className="mt-4 text-balance font-heading text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
            {comparison.heading}
          </h2>
          <div className="mt-5 text-lg leading-8 text-muted-foreground">{comparison.intro}</div>
        </div>
        <div className="mt-10 overflow-x-auto rounded-[1.5rem] border border-border bg-card shadow-xl shadow-foreground/5">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <caption className="sr-only">{comparison.caption}</caption>
            <thead>
              <tr className="border-b border-border bg-muted/60">
                {comparison.columns.map((column) => (
                  <th
                    className="px-5 py-4 text-sm font-bold text-foreground"
                    key={column}
                    scope="col"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map(([topic, awthor, scrivener]) => (
                <tr className="border-b border-border last:border-0" key={topic}>
                  <th
                    className="w-1/5 px-5 py-5 align-top text-sm font-bold text-foreground"
                    scope="row"
                  >
                    {topic}
                  </th>
                  <td className="w-2/5 px-5 py-5 align-top text-sm leading-6 text-muted-foreground">
                    {awthor}
                  </td>
                  <td className="w-2/5 px-5 py-5 align-top text-sm leading-6 text-muted-foreground">
                    {scrivener}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function RelatedPages({ pages }: { pages: RelatedPage[] }) {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Explore Awthor</p>
      <h2 className="mt-4 font-heading text-3xl font-semibold tracking-[-0.025em]">
        Read the details that matter to you.
      </h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {pages.map((page) => (
          <Link
            className="group rounded-[1.5rem] border border-border bg-card p-6 shadow-lg shadow-foreground/5 transition hover:-translate-y-0.5 hover:border-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            href={page.href}
            key={page.href}
          >
            <h3 className="font-heading text-xl font-semibold tracking-tight group-hover:text-primary">
              {page.label}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{page.description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
              Read more
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition group-hover:translate-x-1"
              />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MarketingFooter() {
  return (
    <footer className="mt-8 border-t border-border bg-muted/50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 pt-12 pb-8 sm:px-8 md:flex-row md:items-end md:justify-between lg:px-12">
        <div className="max-w-md">
          <Link
            className="inline-flex items-center gap-2.5 font-heading text-xl font-semibold tracking-tight"
            href="/"
          >
            <BrandMark size={36} />
            awthor
          </Link>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            A free, open-source, local-first novel writing app with on-device proofreading and
            optional sync.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-muted-foreground">
          <Link className="transition-colors hover:text-foreground" href="/">
            Home
          </Link>
          <Link className="transition-colors hover:text-foreground" href="/books">
            Your library
          </Link>
          <a
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            href={GITHUB_URL}
            rel="noreferrer"
            target="_blank"
          >
            Source code
            <ExternalLink aria-hidden="true" className="size-3" />
          </a>
        </div>
      </div>
    </footer>
  );
}
