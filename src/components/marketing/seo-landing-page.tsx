import type { LucideIcon } from "lucide-react";
import { ArrowRight, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  PublicActions,
  PublicCta,
  PublicFooter,
  PublicNavbar,
  PublicScreenshotPlate,
} from "@/components/marketing/public-site";
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
    <div className="awthor-landing public-seo-page min-h-screen overflow-clip bg-background text-foreground transition-colors">
      <SoftwareApplicationJsonLd />
      <PublicNavbar />

      <main>
        <section className="relative isolate border-b border-border">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pt-16 pb-20 sm:px-8 sm:pt-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-12 lg:pt-28 lg:pb-28">
            <div className="max-w-2xl">
              <p className="landing-running-head mb-6 text-primary">{eyebrow}</p>
              <h1 className="text-balance font-serif text-5xl leading-[0.94] font-medium tracking-[-0.045em] sm:text-6xl lg:text-[4.9rem]">
                {title}
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
                {intro}
              </p>

              <PublicActions
                className="mt-9"
                primaryLabel="Start writing"
                secondaryExternal
                secondaryHref={GITHUB_URL}
                secondaryLabel="View source"
              />

              <ul className="seo-hero-facts mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-muted-foreground">
                {heroChecks.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <PublicScreenshotPlate
              alt={heroImage.alt}
              caption={heroImage.caption}
              className="mx-auto w-full max-w-2xl lg:mx-0"
              meta="Awthor · manuscript"
              plate="Plate i"
              priority
              runningHead="The writing room"
              sizes="(min-width: 1024px) 55vw, 100vw"
              src={heroImage.src}
            />
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

        <PublicCta
          description={
            <p>
              Open Awthor in your browser, create a book, and keep the first draft on this device.
              No account or payment step stands between you and the page.
            </p>
          }
          id="start-writing"
          marginLabel="Your next chapter"
          marginNote="No setup ceremony"
          primaryLabel="Start writing"
          title="Start writing before the setup becomes another project."
        />
      </main>

      <PublicFooter />
    </div>
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
