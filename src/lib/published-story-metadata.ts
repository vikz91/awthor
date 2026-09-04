import type { Metadata } from "next";
import { sanitizeBookCoverUrl } from "@/lib/book-cover-generator";
import type { PublishedStory } from "@/lib/database/published-story-snapshot";

const fallbackAuthor = "An Awthor writer";

function normalizeMetadataText(value: string, fallback: string) {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ") || fallback;
}

export function getPublishedStoryAuthor(story: Pick<PublishedStory, "authorName" | "book">) {
  const profileAuthor = normalizeMetadataText(story.authorName, "");
  const bookAuthor = normalizeMetadataText(story.book.author, "");
  return profileAuthor || bookAuthor || fallbackAuthor;
}

export function createPublishedStoryMetadata(story: PublishedStory): Metadata {
  const title = normalizeMetadataText(story.book.title, "Untitled story");
  const author = getPublishedStoryAuthor(story);
  const subtitle = normalizeMetadataText(story.book.subtitle, "");
  const path = `/stories/${encodeURIComponent(story.publicId)}`;
  const coverUrl = sanitizeBookCoverUrl(story.book.coverUrl);
  const imageUrl = coverUrl ? `${path}/cover?v=${encodeURIComponent(story.updatedAt)}` : "/og.png";
  const socialTitle = `${title} · Awthor`;
  const description = subtitle
    ? `${subtitle} — By ${author}. Read on Awthor.`
    : `Read ${title} by ${author} on Awthor.`;
  const imageAlt = coverUrl
    ? `Cover of ${title} by ${author}, published with Awthor`
    : "Awthor — a free, open-source, local-first novel-writing app";

  return {
    alternates: { canonical: path },
    description,
    openGraph: {
      authors: [author],
      description,
      images: [
        coverUrl
          ? { alt: imageAlt, url: imageUrl }
          : { alt: imageAlt, height: 630, url: imageUrl, width: 1200 },
      ],
      locale: "en_US",
      releaseDate: story.publishedAt,
      siteName: "Awthor",
      title: socialTitle,
      type: "book",
      url: path,
    },
    robots: { follow: false, index: false },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: [{ alt: imageAlt, url: imageUrl }],
      title: socialTitle,
    },
  };
}
