import { BookOpenText, Cloud, FileDown, HardDrive, Scale, SpellCheck2 } from "lucide-react";
import type { Metadata } from "next";
import { type MarketingFeature, SeoLandingPage } from "@/components/marketing/seo-landing-page";
import { createMarketingMetadata } from "@/lib/seo";

const description =
  "Write novels in a completely free, open-source workspace with local-first storage, on-device proofreading, portable exports, and optional sync.";

export const metadata: Metadata = createMarketingMetadata({
  title: "Open-source novel writing app · Awthor",
  description,
  path: "/open-source-novel-writing-app",
});

const features: MarketingFeature[] = [
  {
    icon: Scale,
    title: "Open under AGPL-3.0",
    description: (
      <p>
        Awthor&apos;s source is public under the{" "}
        <a
          className="font-semibold text-primary underline underline-offset-4"
          href="https://github.com/vikz91/awthor/blob/main/LICENSE"
          rel="noreferrer"
          target="_blank"
        >
          GNU Affero General Public License v3.0
        </a>
        . You can inspect how it works, run it yourself, modify it, and contribute improvements
        under the licence&apos;s terms.
      </p>
    ),
  },
  {
    icon: HardDrive,
    title: "Local-first by default",
    description:
      "New books and chapters live in this browser's IndexedDB. Opening Awthor does not require an account or send a manuscript to Awthor's sync service.",
  },
  {
    icon: SpellCheck2,
    title: "Proofreading on-device",
    description:
      "Harper runs spelling, grammar, and style checks locally in a browser worker, so ordinary proofreading does not upload the chapter being checked.",
  },
  {
    icon: FileDown,
    title: "Portable drafts and backups",
    description:
      "Export a book as combined Markdown, PDF, or EPUB. A portable Awthor ZIP can also preserve the local workspace for backup and restore.",
  },
  {
    icon: Cloud,
    title: "Sync only when invited",
    description:
      "An account is optional. A writer who wants another device can sign in and explicitly choose Sync; otherwise the workspace remains local to the browser.",
  },
  {
    icon: BookOpenText,
    title: "Built for long-form work",
    description:
      "Keep chapters, characters, settings, and chapter arcs near the manuscript, then move between a Markdown editor and a calm reading view.",
  },
];

export default function OpenSourceNovelWritingAppPage() {
  return (
    <SeoLandingPage
      eyebrow="Free · Open source · Writer-owned"
      title="An open-source novel writing app that keeps you in control."
      intro="Awthor is a completely free browser workspace for planning, drafting, and finishing a novel. Its code is open, its working format is portable, and an account is never the price of starting a book."
      heroChecks={["No paid tier", "No account required", "Portable exports"]}
      heroImage={{
        src: "/screenshots/awthor-writing.jpg",
        alt: "Awthor Markdown writing view open on a novel chapter",
        caption: "A focused Markdown chapter editor with work saved locally",
      }}
      features={features}
      featuresHeading="Open software, practical writing tools."
      featuresIntro="Freedom matters most when it reaches the everyday workflow. Awthor pairs an inspectable codebase with the focused tools a novelist uses chapter after chapter."
      details={[
        {
          heading: "Your manuscript does not depend on a subscription",
          body: [
            "Awthor has no pricing tier. You can create a library, organize chapters, draft, proofread, and export without paying or creating an account. Local writing is the full starting point, not a limited trial designed to force an upgrade.",
            "The manuscript is stored in your browser by default. Optional account sync is available for writers who deliberately want their library on another device, but it is separate from the basic act of writing.",
          ],
          points: [
            "Write and proofread without signing in.",
            "Create local backups on your own schedule.",
            "Download usable manuscript formats whenever you need them.",
          ],
        },
        {
          heading: "A draft you can carry elsewhere",
          body: [
            "Awthor stores chapter text as Markdown rather than hiding every word behind an opaque editor. Combined Markdown is useful for plain-text workflows and version control; EPUB and PDF provide ready-to-read exports; and Awthor backup archives are designed to restore the wider workspace.",
            "Portability is not the same as a backup. Browser-local data can be removed when browser storage is cleared, so Awthor includes backup tools and reminders. Download backups regularly and keep copies somewhere you control.",
          ],
        },
        {
          heading: "Inspect it, self-host it, or improve it",
          body: [
            "Developers can read the application, data, proofreading, sync, publishing, export, WebMCP, and remote MCP implementations in the public repository. The project includes setup notes and validation commands for running a local development instance.",
            "Self-hosters can run the local-only experience without configuring account sync. Optional cloud sync and publishing require their documented services and environment configuration. The AGPL-3.0 licence governs redistribution and network use of modified versions, so review it before deploying your own fork.",
          ],
          points: [
            "Open an issue with a reproducible bug or focused feature idea.",
            "Fork the repository and test a change locally.",
            "Submit a clear pull request that preserves privacy and portability.",
          ],
        },
        {
          heading: "Open source does not mean feature sprawl",
          body: [
            "Awthor is deliberately narrower than an all-purpose publishing suite. It centers the book, chapter, and writing view, with characters, settings, arcs, counts, and proofreading nearby when needed.",
            "That smaller surface can be a virtue for writers who want fewer controls between them and the page. Writers who need advanced typesetting, academic research management, or a complex production pipeline may be better served by a more established desktop tool.",
          ],
        },
      ]}
      relatedPages={[
        {
          href: "/private-local-first-writing-app",
          label: "How local-first privacy works",
          description:
            "Understand browser storage, optional sync, local proofreading, and the limits you should plan for.",
        },
        {
          href: "/scrivener-alternative",
          label: "Awthor and Scrivener compared",
          description:
            "See where Awthor stays intentionally small—and where Scrivener's mature desktop workflow is stronger.",
        },
        {
          href: "/",
          label: "Tour the writing workspace",
          description:
            "See Awthor's library, chapter editor, proofreading drawer, backups, and optional sync.",
        },
      ]}
    />
  );
}
