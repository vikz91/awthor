import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { InlineScript } from "./inline-script";

describe("InlineScript", () => {
  test("renders an executable script in server HTML", () => {
    const markup = renderToStaticMarkup(
      <InlineScript html="document.documentElement.dataset.ready='true'" id="bootstrap" />,
    );

    expect(markup).toContain('id="bootstrap"');
    expect(markup).toContain('type="text/javascript"');
    expect(markup).toContain("document.documentElement.dataset.ready='true'");
  });
});
