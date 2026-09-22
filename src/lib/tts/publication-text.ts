import { fromMarkdown } from "mdast-util-from-markdown";
import { toString as markdownText } from "mdast-util-to-string";
import { withoutLeadingMarkdownTitle } from "@/lib/markdown";

export function publicationText(chapters: readonly { title: string; body: string }[]): string {
  return chapters
    .map((chapter) => {
      const tree = fromMarkdown(withoutLeadingMarkdownTitle(chapter.body));
      return [
        chapter.title,
        ...tree.children.map((node) =>
          node.type === "definition"
            ? ""
            : markdownText(node, { includeImageAlt: false, includeHtml: false }),
        ),
      ].join("\n");
    })
    .join("\n");
}
