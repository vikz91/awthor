import type { Metadata } from "next";
import { CharacterWorkspace } from "./character-workspace";

const bookTitles: Record<string, string> = {
  "the-long-way-home": "The Long Way Home",
  "saltwater-static": "Saltwater Static",
  "paper-moons": "Paper Moons",
  "wildlight-orchard": "Wildlight Orchard",
};

export async function generateMetadata({
  params,
}: PageProps<"/books/[bookId]/characters">): Promise<Metadata> {
  const { bookId } = await params;
  const bookTitle = bookTitles[bookId] ?? "Untitled book";

  return {
    title: `Characters · ${bookTitle}`,
    description: `Develop the cast of ${bookTitle}.`,
  };
}

export default async function CharactersPage({ params }: PageProps<"/books/[bookId]/characters">) {
  const { bookId } = await params;

  return <CharacterWorkspace bookId={bookId} bookTitle={bookTitles[bookId] ?? "Untitled book"} />;
}
