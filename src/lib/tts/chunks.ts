import { z } from "zod";
import { type LanguageChoice, makePassages, type Passage } from "./models";
import { publicationText } from "./publication-text";

export const audioManifestSchema = z.object({
  version: z.string().datetime(),
  generatedAt: z.string().datetime(),
  chapters: z
    .array(
      z.object({
        chapterId: z.string(),
        title: z.string(),
        chunks: z
          .array(
            z.object({
              chunkIndex: z.number().int().nonnegative(),
              url: z.string().url(),
              durationSeconds: z.number().positive(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});
export type AudioManifest = z.infer<typeof audioManifestSchema>;
export type GenerationChunk = {
  id: number;
  chapterId: string;
  chapterTitle: string;
  chunkIndex: number;
  passages: Passage[];
  words: number;
  state: "pending" | "running" | "ready" | "failed";
  leaseUntil: number;
  lease?: string;
  url?: string;
  durationSeconds?: number;
};
export type GenerationJob = {
  format: 2;
  id: string;
  version: string;
  choice: LanguageChoice;
  chunks: GenerationChunk[];
};
export type GenerationStatus = {
  id: string;
  choice: LanguageChoice;
  completedChunks: number;
  totalChunks: number;
  completedChapters: number;
  totalChapters: number;
  chunks: { id: number; chapterId: string; state: GenerationChunk["state"] }[];
};

export function planAudioChunks(
  chapters: readonly { id: string; title: string; body: string }[],
  language: string,
  choice: LanguageChoice,
): GenerationChunk[] {
  const chunks: GenerationChunk[] = [];
  for (const chapter of chapters) {
    const passages = makePassages(publicationText([chapter]), language, choice);
    let current: GenerationChunk | undefined;
    let chunkIndex = 0;
    for (const passage of passages) {
      const words = passage.text.trim().split(/\s+/u).length;
      // Limit words and characters so unspaced scripts cannot create an unbounded request.
      if (
        !current ||
        current.words + words > 120 ||
        current.passages.reduce((n, p) => n + p.text.length, 0) + passage.text.length > 1800
      ) {
        current = {
          id: chunks.length,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          chunkIndex: chunkIndex++,
          passages: [],
          words: 0,
          state: "pending",
          leaseUntil: 0,
        };
        chunks.push(current);
      }
      current.passages.push(passage);
      current.words += words;
    }
  }
  if (!chunks.length) throw new Error("There is no story text to narrate.");
  if (chunks.length > 2000)
    throw new Error("This story is too long for one recording. Publish shorter volumes.");
  return chunks;
}

export function generationStatus(job: GenerationJob): GenerationStatus {
  const chapterIds = new Set(job.chunks.map((c) => c.chapterId));
  return {
    id: job.id,
    choice: job.choice,
    completedChunks: job.chunks.filter((c) => c.state === "ready").length,
    totalChunks: job.chunks.length,
    completedChapters: [...chapterIds].filter((id) =>
      job.chunks.filter((c) => c.chapterId === id).every((c) => c.state === "ready"),
    ).length,
    totalChapters: chapterIds.size,
    chunks: job.chunks.map(({ id, chapterId, state }) => ({ id, chapterId, state })),
  };
}

export function completedManifest(job: GenerationJob): AudioManifest {
  const chapters: AudioManifest["chapters"] = [];
  for (const chunk of job.chunks) {
    if (chunk.state !== "ready" || !chunk.url || !chunk.durationSeconds)
      throw new Error("Some audio chunks are not ready yet.");
    let chapter = chapters.find((c) => c.chapterId === chunk.chapterId);
    if (!chapter) {
      chapter = { chapterId: chunk.chapterId, title: chunk.chapterTitle, chunks: [] };
      chapters.push(chapter);
    }
    chapter.chunks.push({
      chunkIndex: chunk.chunkIndex,
      url: chunk.url,
      durationSeconds: chunk.durationSeconds,
    });
  }
  for (const chapter of chapters) chapter.chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  return audioManifestSchema.parse({
    version: job.version,
    generatedAt: new Date().toISOString(),
    chapters,
  });
}

export function estimatedSeconds(
  elapsedMs: number,
  newlyCompleted: number,
  remaining: number,
): number | undefined {
  return newlyCompleted > 0
    ? Math.ceil((elapsedMs / 1000 / newlyCompleted) * remaining)
    : undefined;
}
