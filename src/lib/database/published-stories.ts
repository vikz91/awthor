import "server-only";

import type { ClientSession, Collection, Db } from "mongodb";
import {
  type PublishedSeriesStory,
  type PublishedStory,
  publicIdSchema,
  publishedStorySchema,
  toPublishedSeriesStory,
} from "./published-story-snapshot";

export {
  buildPublishedStory,
  type PublishedSeriesStory,
  type PublishedStory,
  type PublishedStorySummary,
  publicIdSchema,
  publishedStorySchema,
  toPublishedStorySummary,
} from "./published-story-snapshot";

type StoredPublishedStory = PublishedStory;

function collection(database: Db): Collection<StoredPublishedStory> {
  return database.collection<StoredPublishedStory>("publishedStories");
}

export async function ensurePublishedStoryIndexes(database: Db) {
  await collection(database).createIndex(
    { publicId: 1 },
    { name: "published_story_public_id", unique: true },
  );
  await collection(database).createIndex(
    { bookId: 1, userId: 1 },
    { name: "published_story_owner_book", unique: true },
  );
  await collection(database).createIndex(
    { userId: 1, "book.seriesName": 1, "book.seriesPosition": 1 },
    { name: "published_story_series" },
  );
}

export async function getPublishedStoryByPublicId(database: Db, publicId: string) {
  if (!publicIdSchema.safeParse(publicId).success) return null;
  const story = await collection(database).findOne({ publicId });
  return story ? publishedStorySchema.parse(story) : null;
}

export async function getPublishedStoryForBook(database: Db, userId: string, bookId: string) {
  const story = await collection(database).findOne({ userId, bookId });
  return story ? publishedStorySchema.parse(story) : null;
}

export async function listPublishedStoriesInSeries(
  database: Db,
  story: Pick<PublishedStory, "publicId" | "userId" | "book">,
): Promise<PublishedSeriesStory[]> {
  const seriesName = story.book.seriesName.trim();
  if (!story.book.isPartOfSeries || !seriesName) return [];

  const stories = await collection(database)
    .find({
      userId: story.userId,
      publicId: { $ne: story.publicId },
      "book.isPartOfSeries": true,
      "book.seriesName": seriesName,
    })
    .sort({ "book.seriesPosition": 1, publishedAt: 1 })
    .limit(24)
    .toArray();

  return stories.map((item) => toPublishedSeriesStory(publishedStorySchema.parse(item)));
}

export async function savePublishedStory(database: Db, story: PublishedStory) {
  await collection(database).updateOne(
    { userId: story.userId, bookId: story.bookId },
    { $set: story },
    { upsert: true },
  );
  return story;
}

export async function removePublishedStory(
  database: Db,
  userId: string,
  bookId: string,
  options: { session?: ClientSession } = {},
) {
  return collection(database).deleteOne({ userId, bookId }, { session: options.session });
}
