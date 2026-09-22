import { estimatedSeconds, type GenerationStatus } from "./chunks";
import type { LanguageChoice } from "./models";

export type GenerationProgress = {
  percent: number;
  message: string;
  completedChunks?: number;
  totalChunks?: number;
  completedChapters?: number;
  totalChapters?: number;
  etaSeconds?: number;
};

export function progressFromJob(job: GenerationStatus): GenerationProgress {
  return {
    ...job,
    percent: Math.floor((job.completedChunks / job.totalChunks) * 100),
    message: "Ready to resume saved progress.",
  };
}

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Paused", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}

export async function generatePublishedAudio(
  bookId: string,
  choice: LanguageChoice,
  signal: AbortSignal,
  progress: (value: GenerationProgress) => void,
) {
  const endpoint = `/api/publish/${encodeURIComponent(bookId)}/audio`;
  const options = { headers: { "Content-Type": "application/json" }, signal };
  const response = await fetch(endpoint, {
    ...options,
    method: "POST",
    body: JSON.stringify({ choice }),
  });
  if (!response.ok)
    throw new Error((await response.json()).error || "Could not start audio generation.");
  const job: GenerationStatus = await response.json();
  const completed = new Set(job.chunks.filter((c) => c.state === "ready").map((c) => c.id));
  const initialCount = completed.size;
  const started = performance.now();
  const chapterIds = new Set(job.chunks.map((c) => c.chapterId));
  const report = () =>
    progress({
      percent: Math.floor((completed.size / job.totalChunks) * 100),
      message: completed.size === job.totalChunks ? "Finishing recording…" : "Generating audio…",
      completedChunks: completed.size,
      totalChunks: job.totalChunks,
      completedChapters: [...chapterIds].filter((id) =>
        job.chunks.filter((c) => c.chapterId === id).every((c) => completed.has(c.id)),
      ).length,
      totalChapters: chapterIds.size,
      etaSeconds: estimatedSeconds(
        performance.now() - started,
        completed.size - initialCount,
        job.totalChunks - completed.size,
      ),
    });
  report();
  const pending = job.chunks.filter((c) => !completed.has(c.id));
  let cursor = 0;
  let failed = false;
  const run = async () => {
    while (!failed && cursor < pending.length) {
      signal.throwIfAborted();
      const chunk = pending[cursor++];
      const deadline = performance.now() + 660_000;
      let failures = 0;
      for (;;) {
        signal.throwIfAborted();
        if (performance.now() > deadline)
          throw new Error(
            "A chunk is still busy. Pause and resume shortly; completed chunks are saved.",
          );
        let result: Response;
        try {
          result = await fetch(`${endpoint}/chunk`, {
            ...options,
            method: "POST",
            body: JSON.stringify({ id: job.id, index: chunk.id }),
          });
        } catch (error) {
          signal.throwIfAborted();
          if (++failures > 2) throw error;
          await delay(2000, signal);
          continue;
        }
        if (result.ok) {
          completed.add(chunk.id);
          report();
          break;
        }
        if (result.status === 429) {
          await delay(3000, signal);
          continue;
        }
        if (result.status >= 500 && ++failures <= 2) {
          await delay(2000, signal);
          continue;
        }
        let message = "Audio generation stopped. Resume to retry unfinished chunks.";
        try {
          message = (await result.json()).error || message;
        } catch {
          /* A gateway timeout may return HTML. */
        }
        throw new Error(message);
      }
    }
  };
  const results = await Promise.allSettled(
    Array.from({ length: 2 }, async () => {
      try {
        await run();
      } catch (error) {
        failed = true;
        throw error;
      }
    }),
  );
  signal.throwIfAborted();
  const error = results.find((result) => result.status === "rejected");
  if (error?.status === "rejected") throw error.reason;
  const result = await fetch(endpoint, {
    ...options,
    method: "PATCH",
    body: JSON.stringify({ id: job.id }),
  });
  if (!result.ok)
    throw new Error("All chunks are saved. Resume once more to finish attaching the recording.");
  progress({
    percent: 100,
    message: "Audio is ready on your published story.",
    completedChunks: job.totalChunks,
    totalChunks: job.totalChunks,
    completedChapters: job.totalChapters,
    totalChapters: job.totalChapters,
    etaSeconds: 0,
  });
}
