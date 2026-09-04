import { describe, expect, test } from "bun:test";
import { buildPublishedStory } from "@/lib/database/published-story-snapshot";
import { createSeedRepositoryData } from "@/lib/repository";
import { createPublishedStoryMetadata, getPublishedStoryAuthor } from "./published-story-metadata";

function publishedStory(
  overrides: {
    authorName?: string;
    bookAuthor?: string;
    coverUrl?: string | null;
    subtitle?: string;
  } = {},
) {
  const data = createSeedRepositoryData();
  const sourceBook = data.books[0];

  return buildPublishedStory({
    authorEmail: "writer@example.com",
    authorName: overrides.authorName ?? "A. Writer",
    book: {
      ...sourceBook,
      author: overrides.bookAuthor ?? sourceBook.author,
      coverUrl: overrides.coverUrl === undefined ? sourceBook.coverUrl : overrides.coverUrl,
      subtitle: overrides.subtitle ?? "A mystery behind an ordinary wall.",
    },
    chapters: data.chapters[sourceBook.id],
    now: "2026-09-04T08:30:00.000Z",
    publicId: "published-story-1234",
    userId: "user_123",
  });
}

describe("published story metadata", () => {
  test("includes the title, author, Awthor branding, and a versioned cover", () => {
    const metadata = createPublishedStoryMetadata(publishedStory());

    expect(metadata).toMatchObject({
      alternates: { canonical: "/stories/published-story-1234" },
      description: "A mystery behind an ordinary wall. — By A. Writer. Read on Awthor.",
      openGraph: {
        authors: ["A. Writer"],
        images: [
          {
            alt: "Cover of The Missing Page by A. Writer, published with Awthor",
            url: "/stories/published-story-1234/cover?v=2026-09-04T08%3A30%3A00.000Z",
          },
        ],
        siteName: "Awthor",
        title: "The Missing Page · Awthor",
        type: "book",
      },
      twitter: {
        card: "summary_large_image",
        title: "The Missing Page · Awthor",
      },
    });
  });

  test("uses the book author when the published profile name is empty", () => {
    const story = publishedStory({ authorName: "   ", bookAuthor: "Book Author", subtitle: "" });

    expect(getPublishedStoryAuthor(story)).toBe("Book Author");
    expect(createPublishedStoryMetadata(story).description).toBe(
      "Read The Missing Page by Book Author on Awthor.",
    );
  });

  test("uses the branded fallback image when a book has no cover", () => {
    const metadata = createPublishedStoryMetadata(publishedStory({ coverUrl: null }));

    expect(metadata.openGraph?.images).toEqual([
      {
        alt: "Awthor — a free, open-source, local-first novel-writing app",
        height: 630,
        url: "/og.png",
        width: 1200,
      },
    ]);
    expect(metadata.twitter?.images).toEqual([
      {
        alt: "Awthor — a free, open-source, local-first novel-writing app",
        url: "/og.png",
      },
    ]);
  });
});
