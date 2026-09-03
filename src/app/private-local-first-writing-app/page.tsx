import { Bot, CircleAlert, Cloud, Database, FileDown, ImageIcon, SpellCheck2 } from "lucide-react";
import type { Metadata } from "next";
import { type MarketingFeature, SeoLandingPage } from "@/components/marketing/seo-landing-page";
import { createMarketingMetadata } from "@/lib/seo";

const description =
  "Learn how Awthor keeps novel drafts in browser storage by default, runs proofreading on-device, makes sync optional, and puts backups in the writer's hands.";

export const metadata: Metadata = createMarketingMetadata({
  title: "Private local-first writing app · Awthor",
  description,
  path: "/private-local-first-writing-app",
});

const features: MarketingFeature[] = [
  {
    icon: Database,
    title: "Browser-local by default",
    description:
      "Books, chapters, character notes, settings, and writing preferences are stored locally, primarily in IndexedDB. You can use the writing workspace without an account.",
  },
  {
    icon: Cloud,
    title: "Explicit first sync",
    description:
      "Opening Awthor or merely signing in does not upload a manuscript. The first transfer happens only after you deliberately choose Sync.",
  },
  {
    icon: SpellCheck2,
    title: "Local proofreading",
    description:
      "Harper proofreading is loaded in a browser worker and checks the chapter on-device instead of sending its prose to a remote proofreading API.",
  },
  {
    icon: FileDown,
    title: "Backups you can hold",
    description:
      "Download a restorable Awthor ZIP for the workspace, or export a book as Markdown, PDF, or EPUB. Keep copies outside the browser.",
  },
  {
    icon: ImageIcon,
    title: "Clear external boundaries",
    description:
      "A remote image URL in a cover or manuscript can contact the server that hosts it when the browser loads the image. Use hosts you are comfortable contacting.",
  },
  {
    icon: Bot,
    title: "Intentional tool access",
    description:
      "WebMCP can expose device-local writing actions to compatible browsers; remote MCP works with synced data. Enable either only through clients you trust.",
  },
];

export default function PrivateLocalFirstWritingAppPage() {
  return (
    <SeoLandingPage
      eyebrow="Local-first · Clear boundaries · No account required"
      title="A private writing app built around a local-first manuscript."
      intro="Awthor starts with a simple boundary: your draft stays in this browser unless you choose a feature that crosses it. That makes private writing the default while leaving sync and trusted tool access available when you want them."
      heroChecks={["IndexedDB by default", "On-device proofreading", "Explicit first sync"]}
      heroImage={{
        src: "/screenshots/awthor-spell-check.jpg",
        alt: "Awthor proofreading drawer beside a Markdown novel chapter",
        caption: "Harper checks the open chapter locally in the browser",
      }}
      features={features}
      featuresHeading="Privacy comes from understandable choices."
      featuresIntro="Awthor avoids vague promises. These are the practical boundaries that determine where a manuscript lives, when it can leave the device, and what the writer should still protect."
      details={[
        {
          heading: "What local-first means in Awthor",
          body: [
            "When you create a book, Awthor writes the workspace to browser storage on the current device. IndexedDB holds the main repository; small bootstrap and preference values use local browser storage. The application can be opened and used without an account.",
            "Signing in prepares optional account features, but it is not consent to upload a manuscript. Awthor waits for the writer to choose Sync. After that first explicit sync, later synchronization can run when the local workspace changes, the browser reconnects, or a previously synced workspace is reopened.",
          ],
          points: [
            "Opening the application does not upload your manuscript to Awthor sync.",
            "Signing in alone does not start the first manuscript upload.",
            "Sync is useful across devices, but it changes the storage boundary by design.",
          ],
        },
        {
          heading: "Proofreading stays beside the draft",
          body: [
            "Awthor uses Harper for spelling, grammar, and style suggestions. The proofreading engine runs locally in a browser worker, so the text being checked is not sent to an external proofreading service as part of that workflow.",
            "Suggestions remain suggestions. Writers should review each change in context, especially dialogue, invented terms, historical language, and intentional fragments. Local processing improves the privacy boundary; it does not make automated feedback infallible.",
          ],
        },
        {
          heading: "Browser storage needs a backup plan",
          body: [
            "Local-first does not mean indestructible. Browser data belongs to the browser profile and device. Clearing site data, resetting the browser, losing the device, storage eviction, or hardware failure can remove work that exists only there.",
            "Awthor can export a portable workspace backup and reminds writers to make one regularly. A book can also leave the application as combined Markdown, PDF, or EPUB. Keep versioned backup copies outside the browser—ideally in more than one physical location or storage service you trust.",
          ],
          points: [
            "Download an Awthor backup before clearing site data or changing browsers.",
            "Test that important exports open correctly before relying on them.",
            "Treat optional sync as convenience, not as your only backup.",
          ],
        },
        {
          heading: "Know when another system is involved",
          body: [
            "Some choices necessarily contact another service. Sync sends selected workspace records to Awthor's configured sync backend. Publishing creates a separate read-only snapshot at an unlisted URL. A cover or manuscript image that points to a remote URL can cause the browser to request that image from its external host.",
            "Awthor also supports browser-scoped WebMCP tools for local actions and an authenticated remote MCP boundary for data a writer has already synced. MCP clients can act with meaningful access, so review their permissions and enable these capabilities only in clients you trust.",
          ],
        },
      ]}
      disclaimer={
        <p className="flex gap-3">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
          <span>
            <strong className="text-foreground">An honest privacy note:</strong> no web application
            can promise protection from a compromised device, malicious browser extension, unsafe
            third-party URL, or someone with access to your unlocked browser profile. Awthor&apos;s
            local-first model reduces routine data transfer; it is not a claim of absolute security.
          </span>
        </p>
      }
      relatedPages={[
        {
          href: "/open-source-novel-writing-app",
          label: "Inspect the open-source app",
          description:
            "Review Awthor's AGPL-3.0 code, free feature set, export formats, and contribution path.",
        },
        {
          href: "/scrivener-alternative",
          label: "Compare writing workflows",
          description:
            "See how Awthor's focused browser approach differs from Scrivener's mature desktop toolkit.",
        },
        {
          href: "/",
          label: "See Awthor in context",
          description:
            "Tour the library, manuscript views, chapter tools, local backups, and optional sync.",
        },
      ]}
    />
  );
}
