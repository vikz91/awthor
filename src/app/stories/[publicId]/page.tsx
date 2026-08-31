import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAwthorDatabase } from "@/lib/database/mongodb";
import { getPublishedStoryByPublicId } from "@/lib/database/published-stories";
import { PublicStoryReader } from "./public-story-reader";

type StoryPageProps = {
  params: Promise<{ publicId: string }>;
};

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { publicId } = await params;
  const story = await getStory(publicId);

  if (!story) return { robots: { index: false, follow: false } };

  return {
    description:
      story.book.subtitle ||
      `Read ${story.book.title} by ${story.book.author || "an Awthor writer"}.`,
    robots: { index: false, follow: false },
    title: story.book.title,
  };
}

export default async function PublicStoryPage({ params }: StoryPageProps) {
  const { publicId } = await params;
  const story = await getStory(publicId);
  if (!story) notFound();
  return <PublicStoryReader story={story} />;
}

async function getStory(publicId: string) {
  try {
    return await getPublishedStoryByPublicId(await getAwthorDatabase(), publicId);
  } catch {
    return null;
  }
}
