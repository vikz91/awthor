import type { Metadata } from "next";
import { BookWorkspace } from "./book-workspace";

export const metadata: Metadata = {
  title: "Book workspace",
  description: "Read and write a locally stored Awthor manuscript.",
};

export default async function BookPage({ params }: PageProps<"/books/[bookId]">) {
  const { bookId } = await params;

  return <BookWorkspace bookId={bookId} />;
}
