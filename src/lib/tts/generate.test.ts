import { expect, test } from "bun:test";
import { type GenerationProgress, generatePublishedAudio } from "./generate";

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
test("coordinates two requests, skips saved chunks, and keeps progress monotonic with out-of-order replies", async () => {
  const original = globalThis.fetch;
  const waiting = new Map<number, (response: Response) => void>();
  const requested: number[] = [];
  const updates: GenerationProgress[] = [];
  let active = 0;
  let peak = 0;
  let finalized = false;
  globalThis.fetch = (async (input, options) => {
    if (options?.method === "PATCH") {
      finalized = true;
      return Response.json({ ready: true });
    }
    if (!String(input).endsWith("/chunk"))
      return Response.json({
        id: "job",
        choice: "auto",
        totalChunks: 4,
        totalChapters: 2,
        completedChunks: 1,
        completedChapters: 0,
        chunks: [0, 1, 2, 3].map((id) => ({
          id,
          chapterId: id < 2 ? "a" : "b",
          state: id === 0 ? "ready" : "pending",
        })),
      });
    const { index } = JSON.parse(String(options?.body));
    requested.push(index);
    active++;
    peak = Math.max(active, peak);
    return new Promise<Response>((resolve) =>
      waiting.set(index, (response) => {
        active--;
        resolve(response);
      }),
    );
  }) as typeof fetch;
  try {
    const task = generatePublishedAudio("book", "auto", new AbortController().signal, (value) =>
      updates.push(value),
    );
    await tick();
    expect(requested).toEqual([1, 2]);
    waiting.get(2)?.(Response.json({ ready: true }));
    await tick();
    expect(requested).toEqual([1, 2, 3]);
    waiting.get(3)?.(Response.json({ ready: true }));
    await tick();
    expect(finalized).toBe(false);
    waiting.get(1)?.(Response.json({ ready: true }));
    await task;
    expect(peak).toBe(2);
    expect(finalized).toBe(true);
    expect(updates.map((u) => u.completedChunks)).toEqual([1, 2, 3, 4, 4]);
    expect(updates.at(-1)?.completedChapters).toBe(2);
    expect(updates[0].etaSeconds).toBeUndefined();
  } finally {
    globalThis.fetch = original;
  }
});
