import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAwthorDatabase } from "@/lib/database/mongodb";
import {
  getPublishedStoryByPublicId,
  listPublishedStoriesInSeries,
} from "@/lib/database/published-stories";
import { createPublishedStoryMetadata } from "@/lib/published-story-metadata";
import { PublicStoryReader } from "./public-story-reader";

type StoryPageProps = {
  params: Promise<{ publicId: string }>;
};

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { publicId } = await params;
  const story = await getStory(publicId);

  if (!story) {
    return {
      description: "This published Awthor story is no longer available.",
      robots: { index: false, follow: false },
      title: "Story unavailable",
    };
  }

  return createPublishedStoryMetadata(story);
}

export default async function PublicStoryPage({ params }: StoryPageProps) {
  const { publicId } = await params;
  const story = await getStory(publicId);
  if (!story) notFound();
  const seriesStories = await getSeriesStories(story);
  return <PublicStoryReader seriesStories={seriesStories} story={story} />;
}

async function getStory(publicId: string) {
  try {
    return await getPublishedStoryByPublicId(await getAwthorDatabase(), publicId);
  } catch {
    return null;
  }
}

async function getSeriesStories(story: NonNullable<Awaited<ReturnType<typeof getStory>>>) {
  try {
    return await listPublishedStoriesInSeries(await getAwthorDatabase(), story);
  } catch {
    return [];
  }
}
