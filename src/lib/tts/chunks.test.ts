import { expect, test } from "bun:test";
import {
  completedManifest,
  estimatedSeconds,
  type GenerationJob,
  generationStatus,
  planAudioChunks,
} from "./chunks";

test("long chapters become bounded, ordered chunks without crossing chapters or dropping text", () => {
  const chapters = [
    { id: "a", title: "First", body: "This sentence has exactly six words. ".repeat(50) },
    { id: "b", title: "Second", body: "A brief ending." },
  ];
  const chunks = planAudioChunks(chapters, "English", "auto");
  expect(chunks.filter((c) => c.chapterId === "a").length).toBeGreaterThan(1);
  expect(chunks.at(-1)?.chapterId).toBe("b");
  expect(chunks.map((c) => c.id)).toEqual(chunks.map((_, i) => i));
  expect(chunks.filter((c) => c.chapterId === "a").map((c) => c.chunkIndex)).toEqual([0, 1, 2]);
  expect(chunks.every((c) => c.words <= 120)).toBe(true);
  expect(
    chunks
      .flatMap((c) => c.passages)
      .map((p) => p.text)
      .join(" ")
      .match(/This sentence/g)?.length,
  ).toBe(50);
});

test("chapter progress requires every chunk; manifest preserves planned order after out-of-order completion", () => {
  const chunks = planAudioChunks(
    [
      { id: "a", title: "First", body: "This sentence has exactly six words. ".repeat(50) },
      { id: "b", title: "Second", body: "The end." },
    ],
    "English",
    "auto",
  );
  const job: GenerationJob = {
    format: 2,
    id: "job",
    version: "2026-09-22T00:00:00.000Z",
    choice: "auto",
    chunks,
  };
  chunks[chunks.length - 1].state = "ready";
  chunks[0].state = "ready";
  expect(generationStatus(job).completedChunks).toBe(2);
  expect(generationStatus(job).completedChapters).toBe(1);
  expect(() => completedManifest(job)).toThrow();
  for (const c of [...chunks].reverse()) {
    c.state = "ready";
    c.url = `https://example.com/${c.id}.wav`;
    c.durationSeconds = 2;
  }
  const manifest = completedManifest(job);
  expect(manifest.chapters.map((c) => c.chapterId)).toEqual(["a", "b"]);
  expect(manifest.chapters[0].chunks.map((c) => c.chunkIndex)).toEqual([0, 1, 2]);
  expect(generationStatus(job).completedChapters).toBe(2);
});

test("ETA uses aggregate throughput across completed requests and starts unknown", () => {
  expect(estimatedSeconds(4000, 0, 10)).toBeUndefined();
  expect(estimatedSeconds(10000, 2, 8)).toBe(40);
  expect(estimatedSeconds(10000, 2, 0)).toBe(0);
});
