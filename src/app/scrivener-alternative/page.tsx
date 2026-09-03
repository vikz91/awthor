import { Code2, Feather, FileOutput, Focus, Laptop, Network } from "lucide-react";
import type { Metadata } from "next";
import { type MarketingFeature, SeoLandingPage } from "@/components/marketing/seo-landing-page";
import { createMarketingMetadata } from "@/lib/seo";

const description =
  "Compare Awthor and Scrivener honestly: a free, local-first browser writing app versus a mature native suite for deep outlining, research, and compile workflows.";

export const metadata: Metadata = createMarketingMetadata({
  title: "A thoughtful Scrivener alternative · Awthor",
  description,
  path: "/scrivener-alternative",
});

const features: MarketingFeature[] = [
  {
    icon: Code2,
    title: "Completely free and open",
    description:
      "Awthor has no paid tier and publishes its source under AGPL-3.0. Writers and developers can inspect the implementation or run their own deployment.",
  },
  {
    icon: Laptop,
    title: "Start in the browser",
    description:
      "There is no desktop package to install. Open the site in a modern browser, create a book, and keep the initial workspace on that device.",
  },
  {
    icon: Focus,
    title: "A deliberately smaller surface",
    description:
      "The interface centers a chapter, with characters, settings, chapter arcs, counts, and proofreading available in quiet supporting views.",
  },
  {
    icon: Feather,
    title: "On-device proofreading",
    description:
      "Harper provides local spelling, grammar, and style suggestions without making a remote proofreading service part of the ordinary writing loop.",
  },
  {
    icon: FileOutput,
    title: "Markdown-led portability",
    description:
      "Chapter source is Markdown, and a book can be exported as combined Markdown, PDF, or EPUB. Workspace backups are downloadable separately.",
  },
  {
    icon: Network,
    title: "Opt-in connected tools",
    description:
      "Sync is optional. Writers can also intentionally enable local WebMCP tools or authenticated remote MCP access for a previously synced workspace.",
  },
];

export default function ScrivenerAlternativePage() {
  return (
    <SeoLandingPage
      eyebrow="An honest writing-app comparison"
      title="A simpler, open-source Scrivener alternative—for some writers."
      intro="Awthor and Scrivener solve different versions of the long-form writing problem. Awthor favors a minimal browser workspace, local-first storage, and portable Markdown. Scrivener offers a deeper, mature native environment for complex projects and production."
      heroChecks={["No installation", "No account for local writing", "AGPL-3.0 source"]}
      heroImage={{
        src: "/screenshots/awthor-read-mode.jpg",
        alt: "Awthor read mode showing a novel chapter in a focused browser workspace",
        caption: "Awthor keeps reading and Markdown writing in one focused workspace",
      }}
      features={features}
      featuresHeading="Why Awthor may be the better fit."
      featuresIntro="Awthor is not trying to reproduce every Scrivener feature in a browser. It is a good candidate when the priorities are low setup, inspectable software, a calm interface, and control over portable text."
      details={[
        {
          heading: "Choose Scrivener for deep project architecture",
          body: [
            "Scrivener is the stronger choice when a project depends on a mature native desktop experience, advanced outlining, corkboard planning, a detailed project binder, or extensive research kept beside the draft. Literature & Latte describes workflows for rearranging project sections, viewing research such as PDFs and web pages alongside the manuscript, and moving between editor, corkboard, outliner, and Scrivenings views.",
            "It also has a far more sophisticated Compile system for turning a structured draft into different submission and publishing outputs. Writers with complex professional publishing workflows, large collections of research, or established Scrivener practices should not expect Awthor's smaller toolset to replace that depth.",
          ],
          points: [
            "Advanced corkboard, outliner, binder, and project-metadata workflows.",
            "Research organization designed for many kinds of reference material.",
            "Compile controls for different manuscript and publishing outputs.",
            "A larger, established ecosystem of documentation, tutorials, and experienced users.",
          ],
        },
        {
          heading: "Choose Awthor for less ceremony",
          body: [
            "Awthor can suit a novelist who wants to open a URL and write, without buying a licence, installing a desktop application, or creating an account. Books are local to the browser by default, and the interface keeps the manuscript closer than the project machinery.",
            "Its chapters are written in Markdown and can be exported together as Markdown, PDF, or EPUB. Harper proofreading runs on-device. Optional sync is available when another device matters, while writers who remain local can rely on their own downloadable backups.",
          ],
          points: [
            "A short path from opening the app to writing a chapter.",
            "Public AGPL-3.0 source and no paid feature gate.",
            "Portable Markdown plus straightforward reading exports.",
            "Opt-in WebMCP and remote MCP capabilities for trusted clients.",
          ],
        },
        {
          heading: "Understand the local-first trade-off",
          body: [
            "Awthor's default workspace lives in browser storage rather than a native project bundle. That removes installation and account requirements, but browser data can disappear if site storage is cleared, the profile is reset, or the device is lost. Regular external backups are essential.",
            "Scrivener is a native application built around project files and established desktop workflows. If direct file-system project management, offline desktop conventions, or long-lived platform tooling is central to your process, that model may feel more dependable and familiar.",
          ],
        },
        {
          heading: "Move only after testing a real chapter",
          body: [
            "The best comparison is your own working method. Try one representative chapter, a few character or setting notes, a local proofread, and each export format you expect to use. Confirm that the result fits your editor, collaborator, or publishing handoff before moving an entire manuscript.",
            "Awthor does not promise one-to-one compatibility with every Scrivener project feature. Keep the original project and independent backups during any evaluation or migration.",
          ],
        },
      ]}
      comparison={{
        caption: "Comparison of Awthor and Scrivener writing workflows",
        columns: ["Workflow", "Awthor", "Scrivener"],
        heading: "Different strengths for different manuscripts.",
        intro:
          "Neither tool is universally better. The useful question is which set of trade-offs matches the way you plan, draft, research, and deliver this book.",
        rows: [
          [
            "Access and licence",
            "A free web application with public AGPL-3.0 source. Local writing requires neither an installation nor an account.",
            "A proprietary native product sold under platform licences for macOS and Windows, with a separate iOS app.",
          ],
          [
            "Writing surface",
            "A focused Markdown editor and reading view with lightweight chapter organization and supporting drawers.",
            "A mature native editor within a deep project environment designed for long documents.",
          ],
          [
            "Planning",
            "Reorderable chapters, chapter arcs, character dossiers, settings, and counts without a large planning system.",
            "Integrated binder, project outline, corkboard, outliner, metadata, and flexible restructuring workflows.",
          ],
          [
            "Research",
            "Compact character, setting, and chapter-arc references close to the draft.",
            "A stronger research workspace that can keep notes, photographs, PDFs, web pages, and earlier sections beside the current text.",
          ],
          [
            "Output",
            "Direct export to combined Markdown, PDF, and EPUB, plus a separate restorable workspace backup.",
            "A more sophisticated Compile workflow for assembling and reformatting a project for print, self-publishing, and formats including Word, PDF, Final Draft, and plain text.",
          ],
          [
            "Storage and sync",
            "Browser-local IndexedDB by default, with explicit opt-in account sync and downloadable backups.",
            "Native project files and platform-specific applications; consult Literature & Latte's current guidance for cross-device workflows.",
          ],
          [
            "Extensibility",
            "Developers can inspect, modify, self-host, and contribute. Trusted AI clients can use opt-in WebMCP or remote MCP boundaries.",
            "A larger established product ecosystem with extensive official learning resources and mature professional workflows.",
          ],
          [
            "Best fit",
            "Writers prioritizing simplicity, open source, browser access, local-first behavior, and Markdown portability.",
            "Writers prioritizing detailed planning, substantial research organization, native desktop depth, and advanced manuscript production.",
          ],
        ],
      }}
      disclaimer={
        <p>
          <strong className="text-foreground">Independent comparison:</strong> Awthor is not
          affiliated with, sponsored by, or endorsed by Scrivener or Literature &amp; Latte.
          Scrivener is a product and trademark of its respective owner. This page uses no Scrivener
          logo or product artwork.
        </p>
      }
      sources={[
        {
          href: "https://www.literatureandlatte.com/scrivener/overview",
          label: "Official Scrivener overview",
        },
        {
          href: "https://www.literatureandlatte.com/learn-and-support/video-tutorials",
          label: "Official video tutorials",
        },
        {
          href: "https://www.literatureandlatte.com/scrivener/faqs",
          label: "Official licensing FAQ",
        },
      ]}
      relatedPages={[
        {
          href: "/open-source-novel-writing-app",
          label: "Why Awthor is open source",
          description:
            "Read about the free feature set, AGPL-3.0 licence, portable formats, and ways to contribute.",
        },
        {
          href: "/private-local-first-writing-app",
          label: "Understand Awthor's privacy model",
          description:
            "See what remains local, when sync begins, what can contact external systems, and why backups matter.",
        },
        {
          href: "/",
          label: "Tour Awthor",
          description:
            "Explore the library, chapter editor, manuscript reading view, proofreading, and optional sync.",
        },
      ]}
    />
  );
}
