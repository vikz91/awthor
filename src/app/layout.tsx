import type { Metadata } from "next";
import { Geist_Mono, Newsreader, Nunito_Sans, Outfit, Patrick_Hand } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { BackupReminder } from "@/components/backup-reminder";
import { SyncProvider } from "@/components/sync-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { WebMcpSiteTools } from "@/components/webmcp-site-tools";
import { clerkConfiguration } from "@/lib/auth/config";
import { themeBootstrapScript } from "@/lib/repository";
import { DEFAULT_METADATA_DESCRIPTION, DEFAULT_METADATA_TITLE, SITE_URL } from "@/lib/seo";
import { cn } from "@/lib/utils";

const outfitHeading = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const newsreader = Newsreader({
  axes: ["opsz"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-newsreader",
});

const patrickHand = Patrick_Hand({
  subsets: ["latin"],
  variable: "--font-patrick-hand",
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Awthor",
  title: {
    default: DEFAULT_METADATA_TITLE,
    template: "%s · Awthor",
  },
  description: DEFAULT_METADATA_DESCRIPTION,
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: DEFAULT_METADATA_TITLE,
    description: DEFAULT_METADATA_DESCRIPTION,
    siteName: "Awthor",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Awthor — a free, open-source, local-first novel-writing app",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_METADATA_TITLE,
    description: DEFAULT_METADATA_DESCRIPTION,
    images: [
      {
        url: "/og.png",
        alt: "Awthor — a free, open-source, local-first novel-writing app",
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        nunitoSans.variable,
        outfitHeading.variable,
        geistMono.variable,
        newsreader.variable,
        patrickHand.variable,
      )}
    >
      <head>
        <Script id="awthor-theme" strategy="beforeInteractive">
          {themeBootstrapScript}
        </Script>
      </head>
      <body className="flex min-h-full flex-col">
        <AuthProvider
          enabled={clerkConfiguration.enabled}
          publishableKey={clerkConfiguration.publishableKey}
        >
          <ThemeProvider>
            <SyncProvider>
              {children}
              <BackupReminder />
              <WebMcpSiteTools />
            </SyncProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
