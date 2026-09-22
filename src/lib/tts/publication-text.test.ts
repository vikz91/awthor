import { expect, test } from "bun:test";
import { publicationText } from "./publication-text";

test("narrates the published chapters without duplicate headings or Markdown URLs", () => {
  expect(
    publicationText([
      {
        title: "বাংলা গল্প",
        body: "# বাংলা গল্প\n\nপ্রথম **কথা**।\n\n[Read this](https://example.com) ![cover](https://example.com/a.png)\n\n[ref]: https://example.com/secret",
      },
      { title: "Second", body: "Next paragraph." },
    ])
      .replace(/\s+/g, " ")
      .trim(),
  ).toBe("বাংলা গল্প প্রথম কথা। Read this Second Next paragraph.");
});
