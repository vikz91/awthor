import "server-only";

import type { ClientSession, Collection, Db } from "mongodb";
import {
  type PublishedStory,
  publicIdSchema,
  publishedStorySchema,
} from "./published-story-snapshot";

export {
  buildPublishedStory,
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
