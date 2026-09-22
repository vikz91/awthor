import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import {
  audioOwner,
  audioStories,
  currentGeneration,
  removeAudioBlob,
} from "@/lib/database/story-audio";
import { AudioCapacityError, synthesizeChunk } from "@/lib/tts/native";

export const runtime = "nodejs";
export const maxDuration = 300;
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  let userId: string;
  try {
    userId = await audioOwner();
  } catch {
    return json({ error: "Sign in to generate audio." }, 401);
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    return json({ error: "Audio storage is not configured." }, 503);
  let input: { id: string; index: number };
  try {
    input = await request.json();
    if (typeof input.id !== "string" || !Number.isSafeInteger(input.index) || input.index < 0)
      throw new Error();
  } catch {
    return json({ error: "Invalid chunk." }, 400);
  }
  const stories = await audioStories();
  const bookId = (await params).bookId;
  const story = await stories.findOne({ userId, bookId });
  let job: ReturnType<typeof currentGeneration>;
  try {
    job = currentGeneration(story, input.id);
  } catch {
    return json({ error: "The published version changed. Reopen publishing." }, 409);
  }
  const chunk = job.chunks[input.index];
  if (!chunk || chunk.id !== input.index) return json({ error: "Unknown audio chunk." }, 404);
  if (chunk.state === "ready") return json({ index: input.index, ready: true });
  const prefix = `audioGeneration.chunks.${input.index}`;
  const lease = randomUUID();
  const now = Date.now();
  const owner = { userId, bookId, updatedAt: job.version, "audioGeneration.id": job.id };
  const claimed = await stories.updateOne(
    {
      ...owner,
      [`${prefix}.state`]: { $ne: "ready" },
      [`${prefix}.leaseUntil`]: { $lte: now },
      $expr: {
        $lt: [
          {
            $size: {
              $filter: {
                input: "$audioGeneration.chunks",
                as: "chunk",
                cond: { $gt: ["$$chunk.leaseUntil", now] },
              },
            },
          },
          2,
        ],
      },
    },
    {
      $set: {
        [`${prefix}.state`]: "running",
        [`${prefix}.lease`]: lease,
        [`${prefix}.leaseUntil`]: now + 360_000,
      },
    },
  );
  if (!claimed.matchedCount) return json({ retry: true }, 429);
  const leaseOwner = { ...owner, [`${prefix}.lease`]: lease };
  let uploaded: string | undefined;
  try {
    const { blob, durationSeconds } = await synthesizeChunk(chunk.passages);
    const saved = await put(
      `narration/${story?.publicId}/${job.id}/${input.index}-${lease}.wav`,
      blob,
      {
        access: "public",
        contentType: "audio/wav",
        addRandomSuffix: false,
        cacheControlMaxAge: 60,
      },
    );
    uploaded = saved.url;
    const result = await stories.updateOne(leaseOwner, {
      $set: {
        [`${prefix}.state`]: "ready",
        [`${prefix}.url`]: saved.url,
        [`${prefix}.durationSeconds`]: durationSeconds,
        [`${prefix}.leaseUntil`]: 0,
      },
      $unset: { [`${prefix}.lease`]: "" },
    });
    if (!result.matchedCount) {
      await removeAudioBlob(saved.url);
      return json({ error: "Published version changed. Reopen publishing." }, 409);
    }
    return json({ index: input.index, ready: true });
  } catch (error) {
    if (uploaded) await removeAudioBlob(uploaded);
    await stories.updateOne(leaseOwner, {
      $set: {
        [`${prefix}.state`]: error instanceof AudioCapacityError ? "pending" : "failed",
        [`${prefix}.leaseUntil`]: 0,
      },
      $unset: { [`${prefix}.lease`]: "" },
    });
    if (error instanceof AudioCapacityError) return json({ retry: true }, 429);
    console.warn("Narration chunk failed", {
      index: input.index,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return json(
      { error: "This audio chunk could not be generated. Resume to retry unfinished chunks." },
      503,
    );
  }
}
