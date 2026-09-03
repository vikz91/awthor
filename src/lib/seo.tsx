import type { Metadata } from "next";

export const SITE_URL = "https://awthor.abhishekdeb.com";
export const GITHUB_URL = "https://github.com/vikz91/awthor";
export const LICENSE_URL = "https://www.gnu.org/licenses/agpl-3.0.html";
export const DEFAULT_METADATA_TITLE = "Awthor — A quieter place to write your novel";
export const DEFAULT_METADATA_DESCRIPTION =
  "A free, open-source novel-writing workspace that keeps your manuscript on your device.";

export const PUBLIC_MARKETING_ROUTES = [
  "/",
  "/open-source-novel-writing-app",
  "/private-local-first-writing-app",
  "/scrivener-alternative",
] as const;

type MarketingMetadataInput = {
  description: string;
  path: (typeof PUBLIC_MARKETING_ROUTES)[number];
  title: string;
};

export function createMarketingMetadata({
  description,
  path,
  title,
}: MarketingMetadataInput): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "Awthor",
      images: [
        {
          url: "/og.png",
          width: 1731,
          height: 909,
          alt: "Awthor local-first novel writing workspace",
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        {
          url: "/og.png",
          alt: "Awthor local-first novel writing workspace",
        },
      ],
    },
  };
}

export const HOME_METADATA = createMarketingMetadata({
  title: DEFAULT_METADATA_TITLE,
  description: DEFAULT_METADATA_DESCRIPTION,
  path: "/",
});

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Awthor",
  url: SITE_URL,
  description:
    "A free, open-source, local-first novel writing app with on-device proofreading and optional sync.",
  applicationCategory: "ProductivityApplication",
  applicationSubCategory: "Novel writing software",
  operatingSystem: "Any operating system with a modern web browser",
  browserRequirements: "Requires a modern web browser with IndexedDB support",
  isAccessibleForFree: true,
  license: LICENSE_URL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Local-first browser storage",
    "No account required for local writing",
    "Markdown novel writing",
    "On-device spelling, grammar, and style proofreading with Harper",
    "Markdown, PDF, and EPUB 3 export",
    "Portable local workspace backups",
    "Optional account-based multi-device sync",
    "Opt-in WebMCP and remote MCP tools",
  ],
  sameAs: GITHUB_URL,
} as const;

export function SoftwareApplicationJsonLd() {
  return (
    <script
      id="awthor-software-application-json-ld"
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires a script body; its static payload is serialized and HTML-safe.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(softwareApplicationJsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}
