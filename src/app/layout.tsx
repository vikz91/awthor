import type { Metadata } from "next";
import { Geist_Mono, Nunito_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const themeScript = `
  (() => {
    const themes = ["light", "dark", "paper"];
    let theme = "paper";

    try {
      const savedTheme = localStorage.getItem("awthor-theme");
      if (savedTheme && themes.includes(savedTheme)) theme = savedTheme;
    } catch {}

    const root = document.documentElement;
    root.classList.remove(...themes);
    root.classList.add(theme);
    root.dataset.theme = theme;
    root.style.colorScheme = theme === "dark" ? "dark" : "light";
  })();
`;

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

function parseMetadataBase(value: string | undefined) {
  const origin = value?.trim();
  if (!origin) {
    return null;
  }

  try {
    return new URL(origin.includes("://") ? origin : `https://${origin}`);
  } catch {
    return null;
  }
}

const metadataBase =
  parseMetadataBase(process.env.NEXT_PUBLIC_SITE_URL) ??
  parseMetadataBase(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  parseMetadataBase(process.env.VERCEL_URL) ??
  new URL("http://localhost:3000");

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Awthor — A quieter place to write your novel",
    template: "%s · Awthor",
  },
  description:
    "A free, open-source novel-writing workspace that keeps your manuscript on your device.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Awthor — A quieter place to write your novel",
    description:
      "A free, open-source novel-writing workspace that keeps your manuscript on your device.",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "Awthor" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Awthor — A quieter place to write your novel",
    description:
      "A free, open-source novel-writing workspace that keeps your manuscript on your device.",
    images: ["/og.png"],
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
      )}
    >
      <head>
        <script>{themeScript}</script>
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
