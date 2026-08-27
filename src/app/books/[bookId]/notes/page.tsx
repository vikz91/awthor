import type { Metadata } from "next";
import { NotesWorkspace } from "./notes-workspace";

const bookTitles: Record<string, string> = {
  "paper-moons": "Paper Moons",
  "saltwater-static": "Saltwater Static",
  "the-long-way-home": "The Long Way Home",
  "wildlight-orchard": "Wildlight Orchard",
};

type NotesPageProps = {
  params: Promise<{ bookId: string }>;
};

export async function generateMetadata({ params }: NotesPageProps): Promise<Metadata> {
  const { bookId } = await params;
  const bookTitle = bookTitles[bookId] ?? "Untitled book";

  return {
    title: `Notes · ${bookTitle}`,
    description: `Capture research, scene ideas, and story details for ${bookTitle}.`,
  };
}

export default async function NotesPage({ params }: NotesPageProps) {
  const { bookId } = await params;

  return <NotesWorkspace bookId={bookId} bookTitle={bookTitles[bookId] ?? "Untitled book"} />;
}
