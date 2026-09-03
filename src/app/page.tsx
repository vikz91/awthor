import { ArrowRight, PenLine } from "lucide-react";
import Link from "next/link";
import { LandingMotion, WorkspaceStory } from "@/components/marketing/landing-experience";
import {
  PublicActions,
  PublicCta,
  PublicFooter,
  PublicNavbar,
  PublicScreenshotPlate,
} from "@/components/marketing/public-site";
import { HOME_METADATA, SoftwareApplicationJsonLd } from "@/lib/seo";

export const metadata = HOME_METADATA;

const manuscriptPrinciples = [
  {
    label: "Read / write",
    title: "Nothing between you and the sentence.",
    description:
      "Open the same chapter for reading or writing without leaving the manuscript. Focus mode clears the room when the words need all of it.",
    note: "quiet by design",
  },
  {
    label: "Story work",
    title: "The scaffolding stays close, not loud.",
    description:
      "Characters, chapter arcs, formatting, and live counts remain close enough to call on—and quiet enough to ignore.",
    note: "structure in the margins",
  },
  {
    label: "Proofreading",
    title: "Useful feedback without another reader in the room.",
    description:
      "Harper checks spelling, grammar, and style on your device. Suggestions can enter the margin without sending the chapter away.",
    note: "local by default",
  },
];

const colophonRows = [
  ["Working copy", "Stored in this browser by default"],
  ["Account", "Not required to write"],
  ["Proofreading", "Runs on-device with Harper"],
  ["Sync", "Begins only when you choose it"],
  ["Book exports", "Markdown · PDF · EPUB"],
  ["Workspace backup", "Restorable Awthor ZIP"],
  ["Price", "Free; no paid tier"],
  ["Source", "AGPL-3.0 on GitHub"],
];

export default function Home() {
  return (
    <div
      className="awthor-landing min-h-screen overflow-clip bg-background text-foreground"
      data-landing-root
    >
      <SoftwareApplicationJsonLd />
      <LandingMotion />

      <PublicNavbar />

      <main>
        <section className="landing-hero relative isolate" data-parallax-root>
          <div className="landing-grain" aria-hidden="true" />
          <div className="landing-spread landing-hero-spread mx-auto w-full max-w-[90rem] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
            <aside className="landing-margin-column" aria-label="About Awthor">
              <p className="landing-running-head">Awthor / a local-first novel writer</p>
              <p className="landing-folio">Front matter</p>
              <p className="landing-margin-copy">
                Free and open source.
                <br />
                Sync only if you choose it.
              </p>
            </aside>

            <div className="landing-page-column">
              <div className="landing-hero-copy">
                <h1 className="max-w-6xl text-balance font-serif text-[clamp(4.25rem,8.8vw,9.8rem)] leading-[0.82] font-medium tracking-[-0.065em]">
                  Start with the sentence. Keep the manuscript.
                </h1>
                <div className="landing-hero-intro">
                  <p className="max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
                    Awthor is a calm place to plan, draft, and finish a novel. Your books begin in
                    this browser, with no account to create and no paid tier between you and the
                    page.
                  </p>
                  <PublicActions
                    className="mt-7"
                    primaryLabel="Open a blank book"
                    secondaryHref="/#workspace"
                    secondaryLabel="See the writing room"
                  />
                </div>
              </div>

              <PublicScreenshotPlate
                alt="Awthor Read mode displaying a chapter from a novel"
                caption="One continuous place to read and write"
                className="landing-parallax landing-hero-plate"
                height={998}
                imageClassName="aspect-[1.78/1] object-cover"
                meta="Awthor · Read mode"
                plate="Plate i"
                priority
                runningHead="The working manuscript"
                sizes="(min-width: 1024px) 76vw, 100vw"
                src="/screenshots/awthor-read-mode.jpg"
                width={1920}
              >
                <div className="landing-parallax landing-margin-note" data-parallax-speed="-0.05">
                  Saved in this browser
                </div>
              </PublicScreenshotPlate>
            </div>
          </div>
        </section>

        <section className="landing-writing-invitation" id="first-sentence">
          <div className="landing-spread mx-auto w-full max-w-[90rem] px-5 py-24 sm:px-8 sm:py-28 lg:px-12 lg:py-36">
            <div className="landing-margin-column">
              <p className="landing-running-head">An invitation</p>
              <p className="landing-folio">Before chapter one</p>
            </div>

            <div className="landing-page-column grid items-center gap-14 lg:grid-cols-[0.76fr_1.24fr] lg:gap-24">
              <div>
                <h2 className="max-w-xl text-balance font-serif text-5xl leading-[0.95] font-medium tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                  A first sentence doesn&apos;t need a setup process.
                </h2>
                <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
                  Name the book later. Fix the outline later. For now, write the line that makes you
                  want to know what happens next.
                </p>
                <Link className="landing-action mt-7" href="/books">
                  Write the first sentence
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>

              <div className="landing-writing-leaf" data-writing-leaf data-written="false">
                <div className="landing-writing-head">
                  <span>Untitled novel</span>
                  <span>Day one</span>
                </div>
                <p className="landing-writing-chapter">Chapter one</p>
                <div className="landing-writing-stage">
                  <span className="sr-only">It began with a knock at the door.</span>
                  <p aria-hidden="true" className="landing-writing-copy">
                    It began with a knock at the door.
                  </p>
                  <PenLine aria-hidden="true" className="landing-writing-pen" strokeWidth={1.5} />
                </div>
                <div className="landing-writing-rule" />
                <div className="landing-writing-rule landing-writing-rule-short" />
                <p className="landing-writing-aside">One honest sentence is enough for today.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="manuscript">
          <div className="landing-spread mx-auto w-full max-w-[90rem] px-5 py-24 sm:px-8 sm:py-32 lg:px-12 lg:py-40">
            <div className="landing-margin-column">
              <p className="landing-running-head">The working manuscript</p>
              <p className="landing-folio">Tools in the margins</p>
            </div>

            <div className="landing-page-column">
              <h2 className="max-w-5xl text-balance font-serif text-5xl leading-[0.92] font-medium tracking-[-0.05em] sm:text-7xl lg:text-8xl">
                The tools stay in the margins.
              </h2>
              <p className="landing-dropcap mt-9 max-w-3xl font-serif text-xl leading-9 text-muted-foreground sm:text-2xl sm:leading-10">
                Awthor keeps the scaffolding close and the machinery out of sight. A long draft gets
                room to breathe; its structure remains ready when you reach for it.
              </p>

              <div className="landing-manifesto mt-20">
                {manuscriptPrinciples.map((principle) => (
                  <article className="landing-manifesto-entry" key={principle.label}>
                    <p className="landing-manifesto-label">{principle.label}</p>
                    <div>
                      <h3 className="max-w-2xl font-heading text-2xl leading-tight font-semibold tracking-[-0.025em] sm:text-3xl">
                        {principle.title}
                      </h3>
                      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                        {principle.description}
                      </p>
                    </div>
                    <p className="landing-manifesto-note">{principle.note}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="landing-workspace-section landing-section" id="workspace">
          <div className="mx-auto w-full max-w-[90rem] px-5 py-24 sm:px-8 sm:py-32 lg:px-12 lg:py-40">
            <div className="landing-spread">
              <div className="landing-margin-column">
                <p className="landing-running-head">The writing room</p>
                <p className="landing-folio">Three views, one book</p>
              </div>
              <div className="landing-page-column border-b border-border pb-14 lg:pb-20">
                <h2 className="max-w-5xl text-balance font-serif text-5xl leading-[0.92] font-medium tracking-[-0.05em] sm:text-7xl lg:text-8xl">
                  Return to the story, not the software.
                </h2>
              </div>
            </div>
            <WorkspaceStory />
          </div>
        </section>

        <section className="landing-section" id="colophon">
          <div className="landing-spread mx-auto w-full max-w-[90rem] px-5 py-24 sm:px-8 sm:py-32 lg:px-12 lg:py-40">
            <div className="landing-margin-column">
              <p className="landing-running-head">Colophon</p>
              <p className="landing-folio">The honest details</p>
            </div>

            <div className="landing-page-column">
              <div className="grid items-end gap-8 border-b border-border pb-14 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
                <h2 className="max-w-5xl text-balance font-serif text-5xl leading-[0.92] font-medium tracking-[-0.05em] sm:text-7xl lg:text-8xl">
                  The manuscript details are yours to read.
                </h2>
                <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                  Awthor makes its boundaries explicit: where the draft lives, when anything leaves
                  the device, and how you can take a copy.
                </p>
              </div>

              <div className="landing-colophon-grid">
                <dl className="landing-colophon-list">
                  {colophonRows.map(([term, detail]) => (
                    <div className="landing-colophon-row" key={term}>
                      <dt>{term}</dt>
                      <dd>{detail}</dd>
                    </div>
                  ))}
                </dl>

                <figure className="landing-excerpt">
                  <div className="landing-writing-head">
                    <span>The Cartographer&apos;s Winter</span>
                    <span>Chapter one</span>
                  </div>
                  <blockquote>
                    <p>
                      Mara drew the coast from memory, which meant the sea arrived first and the
                      land had to learn its shape around it.
                    </p>
                  </blockquote>
                  <figcaption>One manuscript. Open formats. No lock-in.</figcaption>
                </figure>
              </div>

              <p className="landing-storage-note">
                <strong>A note worth keeping:</strong> browser storage is local, not indestructible.
                Make a backup before clearing site data, changing browsers, or moving devices.
              </p>
            </div>
          </div>
        </section>

        <PublicCta
          description={
            <p>
              Open Awthor and begin. There is no account wall, onboarding ritual, or subscription
              decision waiting before the page.
            </p>
          }
          id="open-source"
          title="One honest sentence is enough for today."
        />
      </main>

      <PublicFooter />
    </div>
  );
}
