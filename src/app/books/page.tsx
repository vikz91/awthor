import type { Metadata } from "next";
import { Suspense } from "react";
import { BooksLibrary, BooksLibraryFallback } from "./books-library";

export const metadata: Metadata = {
  title: "Your books",
  description: "A private, local-first library for your novels and works in progress.",
};

export default function BooksPage() {
  return (
    <Suspense fallback={<BooksLibraryFallback />}>
      <BooksLibrary />
    </Suspense>
  );
}
