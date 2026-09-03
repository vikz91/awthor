import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LibraryMobileHeaderFrame } from "./books-library";

describe("LibraryMobileHeaderFrame", () => {
  it("keeps the primary library actions labeled and touch-friendly", () => {
    const markup = renderToStaticMarkup(
      <LibraryMobileHeaderFrame
        onNewBook={() => undefined}
        onOpenMore={() => undefined}
        onQueryChange={() => undefined}
        query=""
      />,
    );

    expect(markup).toContain("Awthor home");
    expect(markup).toContain("New book");
    expect(markup).toContain("More library actions");
    expect(markup.match(/h-11/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("renders a full-width, labeled search control with the current query", () => {
    const markup = renderToStaticMarkup(
      <LibraryMobileHeaderFrame
        onNewBook={() => undefined}
        onOpenMore={() => undefined}
        onQueryChange={() => undefined}
        query="river"
      />,
    );

    expect(markup).toContain('for="book-search-mobile"');
    expect(markup).toContain('id="book-search-mobile"');
    expect(markup).toContain("Search books by title or author");
    expect(markup).toContain('value="river"');
    expect(markup).toContain("w-full");
  });
});
