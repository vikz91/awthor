import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import PublishedStoryNotFound from "./not-found";

describe("PublishedStoryNotFound", () => {
  test("explains that a publication can be removed and offers a route home", () => {
    const markup = renderToStaticMarkup(<PublishedStoryNotFound />);

    expect(markup).toContain("Story unavailable");
    expect(markup).toContain("The author may have unpublished it");
    expect(markup).toContain("Go to Awthor home");
    expect(markup).toContain('href="/"');
  });
});
