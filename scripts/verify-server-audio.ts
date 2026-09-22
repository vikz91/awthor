/** Explicit integration check: creates an isolated Mongo collection and temporary Blob audio, then cleans both. Run with Bun and configured storage credentials. */
import { mock } from "bun:test";
import { del } from "@vercel/blob";
import { MongoClient } from "mongodb";
import { buildPublishedStory } from "../src/lib/database/published-story-snapshot";
import { createSeedRepositoryData } from "../src/lib/repository";

mock.module("server-only", () => ({}));
const helpers = await import("../src/lib/database/story-audio");
const client = new MongoClient(process.env.MONGODB_URI ?? "");
await client.connect();
const collection = client
  .db(process.env.MONGODB_DB || "awthor")
  .collection(`audioVerification_${crypto.randomUUID().replaceAll("-", "")}`);
let owner = "audio-verification-owner";
mock.module("@/lib/database/story-audio", () => ({
  ...helpers,
  audioOwner: async () => owner,
  audioStories: async () => collection,
}));
const route = await import("../src/app/api/publish/[bookId]/audio/route");
const chunkRoute = await import("../src/app/api/publish/[bookId]/audio/chunk/route");
const seed = createSeedRepositoryData();
const book = seed.books[0];
const sourceChapter = seed.chapters[book.id][0];
const version = "2026-09-22T00:00:00.000Z";
const story = buildPublishedStory({
  authorName: "Audio verification",
  authorEmail: "",
  userId: owner,
  publicId: crypto.randomUUID().replaceAll("-", ""),
  now: version,
  book,
  chapters: [
    {
      ...sourceChapter,
      id: "first",
      number: 1,
      title: "First",
      body: "This is a short sentence. ".repeat(80),
    },
    { ...sourceChapter, id: "second", number: 2, title: "Second", body: "Here is the ending." },
  ],
});
const context = { params: Promise.resolve({ bookId: book.id }) };
const request = (body: unknown) =>
  new Request("http://localhost/api/audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const check = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};
const report = (value: unknown) => {
  process.stdout.write(`${typeof value === "string" ? value : JSON.stringify(value)}\n`);
};
const urls = new Set<string>();
const inflight: Promise<Response>[] = [];
try {
  // Query planning may evaluate $expr on stories without an audio job.
  await collection.insertMany([
    { bookId: "no-audio-job", userId: owner },
    { bookId: "null-audio-job", userId: owner, audioGeneration: null },
  ]);
  await collection.createIndex({ userId: 1 });
  await collection.createIndex({ bookId: 1 });
  await collection.insertOne(story);
  const response = await route.POST(request({ choice: "en" }), context);
  check(response.ok, "Job creation failed");
  const job = await response.json();
  check(job.totalChunks >= 5 && job.totalChapters === 2, "Expected a multi-chunk chapter");
  owner = "another-owner";
  check(
    (await chunkRoute.POST(request({ id: job.id, index: 0 }), context)).status === 409,
    "Other owner could access a job",
  );
  owner = story.userId;
  const started = performance.now();
  const batch = Array.from({ length: 4 }, (_, index) =>
    chunkRoute.POST(request({ id: job.id, index }), context),
  );
  inflight.push(...batch);
  // Wait for the four atomic leases before trying a duplicate and fifth concurrent request.
  for (let attempts = 0; attempts < 50; attempts++) {
    const doc = await collection.findOne({ bookId: book.id });
    if (
      doc?.audioGeneration.chunks.filter((c: { state: string }) => c.state === "running").length ===
      4
    )
      break;
    await new Promise((r) => setTimeout(r, 100));
  }
  check(
    (await chunkRoute.POST(request({ id: job.id, index: 0 }), context)).status === 429,
    "Duplicate chunk was not locked",
  );
  check(
    (await chunkRoute.POST(request({ id: job.id, index: 4 }), context)).status === 429,
    "More than four concurrent chunks allowed",
  );
  const results = await Promise.all(batch);
  for (const result of results) check(result.ok, `Chunk request failed: ${await result.text()}`);
  report(
    JSON.stringify({
      fourConcurrentChunksSeconds: Math.round((performance.now() - started) / 1000),
    }),
  );
  const resumed = await (await route.POST(request({ choice: "en" }), context)).json();
  check(
    resumed.id === job.id && resumed.completedChunks === 4,
    "Resume did not preserve finished chunks",
  );
  check(
    (await route.PATCH(request({ id: job.id }), context)).status === 409,
    "Incomplete audio was published",
  );
  for (let index = 4; index < job.totalChunks; index++)
    check(
      (await chunkRoute.POST(request({ id: job.id, index }), context)).ok,
      "Later chunk failed",
    );
  const generated = await collection.findOne({ bookId: book.id });
  for (const chunk of generated?.audioGeneration.chunks ?? []) if (chunk.url) urls.add(chunk.url);
  await collection.updateOne(
    { bookId: book.id },
    { $set: { updatedAt: "2026-09-22T00:00:01.000Z" } },
  );
  check(
    (await route.PATCH(request({ id: job.id }), context)).status === 409,
    "Stale generation was published",
  );
  await collection.updateOne({ bookId: book.id }, { $set: { updatedAt: version } });
  check((await route.PATCH(request({ id: job.id }), context)).ok, "Finalization failed");
  const final = await collection.findOne({ bookId: book.id });
  check(
    final?.audio.chapters.length === 2 && final.audio.chapters[0].chunks.length >= 2,
    "Manifest chapter order missing",
  );
  report(
    JSON.stringify({
      result: "passed",
      chunks: job.totalChunks,
      chapters: 2,
      checks: [
        "ownership",
        "four-request limit",
        "duplicate lease",
        "resume",
        "incomplete rejection",
        "stale version rejection",
        "ordered manifest",
      ],
    }),
  );
} finally {
  await Promise.allSettled(inflight);
  const doc = await collection.findOne({ bookId: book.id });
  for (const chunk of doc?.audioGeneration?.chunks ?? []) if (chunk.url) urls.add(chunk.url);
  for (const chapter of doc?.audio?.chapters ?? [])
    for (const chunk of chapter.chunks) urls.add(chunk.url);
  if (urls.size) await del([...urls]);
  await collection.drop();
  await client.close();
  report("Temporary verification collection and audio removed.");
}
