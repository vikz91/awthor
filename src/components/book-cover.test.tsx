import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { generatedBookCoverDataUrlPrefix } from "@/lib/book-cover-generator";
import { BookCover } from "./book-cover";

describe("BookCover", () => {
  test("renders a generated cover without duplicating its baked-in title and author", () => {
    const markup = renderToStaticMarkup(
      <BookCover
        author="Mira Sen"
        bookId="book-1"
        coverUrl={`${generatedBookCoverDataUrlPrefix}AQIDBA==`}
        title="The Missing Page"
      />,
    );

    expect(markup).toContain(generatedBookCoverDataUrlPrefix);
    expect(markup).not.toContain("bg-cover-overlay");
  });

  test("keeps the existing CSS fallback for books without a stored cover", () => {
    const markup = renderToStaticMarkup(
      <BookCover author="Mira Sen" bookId="book-1" title="The Missing Page" />,
    );

    expect(markup).toContain("Generated cover for The Missing Page");
    expect(markup).toContain("bg-cover-overlay");
  });
});
