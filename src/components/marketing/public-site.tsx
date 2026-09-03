import { ArrowRight, Code2, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { SyncAccountAction } from "@/components/sync-account-action";
import { GITHUB_URL } from "@/lib/seo";
import { cn } from "@/lib/utils";

const primaryNavigation = [
  { href: "/#manuscript", label: "The manuscript" },
  { href: "/#workspace", label: "The writing room" },
  { href: "/private-local-first-writing-app", label: "Privacy" },
  { href: "/open-source-novel-writing-app", label: "Open source" },
];

const footerNavigation = [
  {
    label: "Explore",
    links: [
      { href: "/#manuscript", label: "The manuscript" },
      { href: "/#workspace", label: "The writing room" },
      { href: "/books", label: "Your library" },
      { href: "/scrivener-alternative", label: "Scrivener comparison" },
    ],
  },
  {
    label: "About",
    links: [
      { href: "/open-source-novel-writing-app", label: "Open-source writing" },
      { href: "/private-local-first-writing-app", label: "Private, local-first writing" },
      { external: true, href: GITHUB_URL, label: "GitHub ↗" },
    ],
  },
];

export function PublicNavbar() {
  return (
    <header className="landing-header sticky top-0 z-50">
      <div className="mx-auto flex h-18 w-full max-w-[90rem] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link
          className="group flex items-center gap-2.5 font-heading text-xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          href="/"
        >
          <BrandMark className="transition-transform duration-300 group-hover:-rotate-6" />
          awthor
        </Link>

        <nav
          aria-label="Public navigation"
          className="hidden items-center gap-8 text-sm font-bold text-muted-foreground lg:flex"
        >
          {primaryNavigation.map((item) => (
            <Link className="landing-nav-link" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <SyncAccountAction variant="landing-header" />
          <Link
            className="hidden px-2 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring md:inline-flex"
            href="/books"
          >
            Your library
          </Link>
          <Link className="landing-primary-button" href="/books">
            Start writing
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

type PublicActionsProps = {
  className?: string;
  primaryHref?: string;
  primaryLabel: string;
  secondaryExternal?: boolean;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function PublicActions({
  className,
  primaryHref = "/books",
  primaryLabel,
  secondaryExternal = false,
  secondaryHref,
  secondaryLabel,
}: PublicActionsProps) {
  return (
    <div className={cn("flex flex-col items-start gap-4 sm:flex-row sm:items-center", className)}>
      <Link className="landing-action landing-action-primary" href={primaryHref}>
        {primaryLabel}
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
      {secondaryHref && secondaryLabel ? (
        secondaryExternal ? (
          <a className="landing-action" href={secondaryHref} rel="noreferrer" target="_blank">
            <Code2 aria-hidden="true" className="size-4" />
            {secondaryLabel}
            <ExternalLink aria-hidden="true" className="size-3" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <Link className="landing-action" href={secondaryHref}>
            {secondaryLabel}
          </Link>
        )
      ) : null}
    </div>
  );
}

type PublicScreenshotPlateProps = {
  alt: string;
  caption: ReactNode;
  children?: ReactNode;
  className?: string;
  height?: number;
  imageClassName?: string;
  meta: string;
  plate: string;
  priority?: boolean;
  runningHead: string;
  sizes: string;
  src: string;
  width?: number;
};

export function PublicScreenshotPlate({
  alt,
  caption,
  children,
  className,
  height = 1024,
  imageClassName,
  meta,
  plate,
  priority = false,
  runningHead,
  sizes,
  src,
  width = 1536,
}: PublicScreenshotPlateProps) {
  return (
    <figure className={cn("public-screenshot-plate", className)}>
      <div className="landing-plate-head">
        <span>{runningHead}</span>
        <span>{meta}</span>
      </div>
      <Image
        alt={alt}
        className={cn("h-auto w-full object-top", imageClassName)}
        height={height}
        priority={priority}
        sizes={sizes}
        src={src}
        width={width}
      />
      <figcaption className="landing-plate-caption">
        <span>{caption}</span>
        <span>{plate}</span>
      </figcaption>
      {children}
    </figure>
  );
}

type PublicCtaProps = {
  description: ReactNode;
  id?: string;
  marginLabel?: string;
  marginNote?: string;
  primaryLabel?: string;
  title: ReactNode;
};

export function PublicCta({
  description,
  id,
  marginLabel = "Chapter one",
  marginNote = "The rest is yours",
  primaryLabel = "Begin writing",
  title,
}: PublicCtaProps) {
  return (
    <section className="landing-last-page landing-section" id={id}>
      <div className="landing-spread mx-auto w-full max-w-[90rem] px-5 py-24 sm:px-8 sm:py-32 lg:px-12 lg:py-44">
        <div className="landing-margin-column">
          <p className="landing-running-head">{marginLabel}</p>
          <p className="landing-folio">{marginNote}</p>
        </div>

        <div className="landing-page-column">
          <p className="landing-ending-line">Begin anywhere</p>
          <h2 className="mt-8 max-w-5xl text-balance font-serif text-6xl leading-[0.9] font-medium tracking-[-0.055em] sm:text-8xl lg:text-[8.5rem]">
            {title}
          </h2>
          <div className="mt-9 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            {description}
          </div>
          <div className="landing-blank-line" aria-hidden="true">
            <span />
          </div>
          <PublicActions
            className="mt-10"
            primaryLabel={primaryLabel}
            secondaryExternal
            secondaryHref={GITHUB_URL}
            secondaryLabel="Read the source"
          />
        </div>
      </div>
    </section>
  );
}

export function PublicFooter() {
  return (
    <footer className="landing-footer">
      <div className="mx-auto w-full max-w-[90rem] px-5 pt-14 pb-8 sm:px-8 lg:px-12 lg:pt-16">
        <div className="grid gap-12 border-b border-border pb-12 sm:grid-cols-2 lg:grid-cols-[1.45fr_0.8fr_0.8fr] lg:gap-16">
          <div className="max-w-sm">
            <Link
              className="inline-flex items-center gap-2.5 font-heading text-xl font-semibold"
              href="/"
            >
              <BrandMark size={36} />
              awthor
            </Link>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              A calm, free, local-first writing space for planning, drafting, and finishing your
              novel.
            </p>
            <p className="mt-6 font-mono text-[0.68rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Your words stay yours
            </p>
          </div>

          {footerNavigation.map((group) => (
            <nav aria-label={group.label} key={group.label}>
              <h2 className="font-mono text-[0.68rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                {group.label}
              </h2>
              <ul className="mt-5 space-y-3 text-sm font-semibold text-muted-foreground">
                {group.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        className="transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                        href={link.href}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {link.label}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      <Link
                        className="transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                        href={link.href}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="flex flex-col gap-3 pt-7 text-xs font-semibold text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Awthor contributors.</p>
          <p>Free · Open source · Local-first</p>
        </div>
      </div>
    </footer>
  );
}
