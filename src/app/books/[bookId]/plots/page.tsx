import type { Metadata } from "next";
import { PlotWorkspace } from "./plot-workspace";

const bookTitles: Record<string, string> = {
  "paper-moons": "Paper Moons",
  "saltwater-static": "Saltwater Static",
  "the-long-way-home": "The Long Way Home",
  "wildlight-orchard": "Wildlight Orchard",
};

type PlotsPageProps = {
  params: Promise<{ bookId: string }>;
};

export async function generateMetadata({ params }: PlotsPageProps): Promise<Metadata> {
  const { bookId } = await params;
  const bookTitle = bookTitles[bookId] ?? "Untitled book";

  return {
    title: `Plots · ${bookTitle}`,
    description: `Develop plot threads, story beats, and stakes for ${bookTitle}.`,
  };
}

export default async function PlotsPage({ params }: PlotsPageProps) {
  const { bookId } = await params;

  return <PlotWorkspace bookId={bookId} bookTitle={bookTitles[bookId] ?? "Untitled book"} />;
}
