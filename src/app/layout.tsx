import type { Metadata } from "next";
import { Geist_Mono, Nunito_Sans, Outfit } from "next/font/google";
import "./globals.css";
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Awthor — A quieter place to write your novel",
    template: "%s · Awthor",
  },
  description:
    "A free, open-source novel-writing workspace that keeps your manuscript on your device.",
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
      className={cn(
        "h-full antialiased",
        nunitoSans.variable,
        outfitHeading.variable,
        geistMono.variable,
      )}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
