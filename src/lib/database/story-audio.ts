import "server-only";
import { auth } from "@clerk/nextjs/server";
import { del } from "@vercel/blob";
import { clerkConfiguration } from "@/lib/auth/config";
import { isSyncAccountAuthorized } from "@/lib/auth/sync-access";
import type { GenerationJob } from "@/lib/tts/chunks";
import { getAwthorDatabase } from "./mongodb";
import type { PublishedStory } from "./published-story-snapshot";

export type AudioStory = PublishedStory & { audioGeneration?: GenerationJob };

export async function audioOwner() {
  if (!clerkConfiguration.enabled) throw new Error("Sign in to generate audio.");
  const { userId } = await auth();
  if (!userId || !(await isSyncAccountAuthorized(userId)))
    throw new Error("Sign in with an authorized publishing account.");
  return userId;
}

export async function audioStories() {
  return (await getAwthorDatabase()).collection<AudioStory>("publishedStories");
}

export function currentGeneration(story: AudioStory | null, id: string) {
  const job = story?.audioGeneration;
  if (!story || !job || job.format !== 2 || job.id !== id || job.version !== story.updatedAt) {
    throw new Error("This published version changed. Reopen the publish dialog and try again.");
  }
  return job;
}

export function audioUrls(audio: PublishedStory["audio"]): string[] {
  if (!audio) return [];
  return "url" in audio
    ? [audio.url]
    : audio.chapters.flatMap((chapter) => chapter.chunks.map((chunk) => chunk.url));
}

export async function removeRecording(audio: PublishedStory["audio"]) {
  const urls = audioUrls(audio);
  if (!urls.length || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(urls);
  } catch {
    console.warn("Old narration files could not be removed.");
  }
}

export async function removeAudioBlob(url: string | undefined) {
  if (!url || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(url);
  } catch {
    // Publication changes must still succeed if storage is temporarily unavailable.
    console.warn("A replaced story audio file could not be removed from Blob storage.");
  }
}
