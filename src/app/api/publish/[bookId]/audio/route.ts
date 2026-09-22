import { randomUUID } from "node:crypto";
import {
  audioOwner,
  audioStories,
  currentGeneration,
  removeRecording,
} from "@/lib/database/story-audio";
import {
  completedManifest,
  type GenerationJob,
  generationStatus,
  planAudioChunks,
} from "@/lib/tts/chunks";
import { type LanguageChoice, ttsModels } from "@/lib/tts/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ bookId: string }> };
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(_request: Request, { params }: Context) {
  try {
    const userId = await audioOwner();
    const story = await (await audioStories()).findOne({ userId, bookId: (await params).bookId });
    const job = story?.audioGeneration;
    return json({
      configured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      ready: Boolean(story?.audio && story.audio.version === story.updatedAt),
      job: job?.format === 2 && job.version === story?.updatedAt ? generationStatus(job) : null,
    });
  } catch {
    return json({ error: "Sign in to manage narration." }, 401);
  }
}

export async function POST(request: Request, { params }: Context) {
  let userId: string;
  try {
    userId = await audioOwner();
  } catch {
    return json({ error: "Sign in to generate audio." }, 401);
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    return json({ error: "Connect a public Vercel Blob store first." }, 503);
  try {
    const { choice } = await request.json();
    if (choice !== "auto" && !Object.hasOwn(ttsModels, choice))
      return json({ error: "Choose a supported language." }, 400);
    const stories = await audioStories();
    const bookId = (await params).bookId;
    const story = await stories.findOne({ userId, bookId });
    if (!story) return json({ error: "Publish this story first." }, 404);
    const existing = story.audioGeneration;
    if (
      existing?.format === 2 &&
      existing.version === story.updatedAt &&
      existing.choice === choice
    )
      return json(generationStatus(existing));
    const job: GenerationJob = {
      format: 2,
      id: randomUUID(),
      version: story.updatedAt,
      choice: choice as LanguageChoice,
      chunks: planAudioChunks(story.chapters, story.book.language, choice),
    };
    // Compare-and-set prevents simultaneous tabs from replacing each other's new job.
    const result = await stories.updateOne(
      {
        userId,
        bookId,
        updatedAt: story.updatedAt,
        ...(existing
          ? { "audioGeneration.id": existing.id }
          : { audioGeneration: { $exists: false } }),
      },
      { $set: { audioGeneration: job } },
    );
    if (!result.matchedCount)
      return json({ error: "Another generation started. Retry to resume it." }, 409);
    return json(generationStatus(job));
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Could not start generation." },
      400,
    );
  }
}

export async function PATCH(request: Request, { params }: Context) {
  let userId: string;
  try {
    userId = await audioOwner();
  } catch {
    return json({ error: "Sign in to finish generation." }, 401);
  }
  try {
    const { id } = await request.json();
    if (typeof id !== "string") return json({ error: "Invalid generation." }, 400);
    const stories = await audioStories();
    const bookId = (await params).bookId;
    const story = await stories.findOne({ userId, bookId });
    const job = currentGeneration(story, id);
    const audio = completedManifest(job);
    const result = await stories.updateOne(
      { userId, bookId, updatedAt: job.version, "audioGeneration.id": id },
      { $set: { audio }, $unset: { audioGeneration: "" } },
    );
    if (!result.matchedCount)
      return json({ error: "The published story changed. Reopen publishing." }, 409);
    await removeRecording(story?.audio);
    return json({ ready: true });
  } catch {
    return json(
      { error: "Some chunks are not ready or the published story changed. Resume generation." },
      409,
    );
  }
}
