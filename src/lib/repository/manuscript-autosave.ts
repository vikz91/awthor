import type { AwthorRepository, ManuscriptSaveResult } from "./contract";
import type { SaveState } from "./models";

export type ManuscriptAutosaveOptions = {
  bookId: string;
  chapterId: string;
  delay?: number;
  onStateChange?: (state: SaveState, error?: Error) => void;
  onSaved?: (result: ManuscriptSaveResult) => void;
};

export interface ManuscriptAutosave {
  schedule(markdown: string): void;
  flush(): Promise<void>;
  cancel(): void;
}

/**
 * Small browser-agnostic coordinator for the workspace's local draft autosave.
 * Create one per active chapter and flush it before changing workspace context.
 */
export function createManuscriptAutosave(
  repository: Pick<AwthorRepository, "saveManuscript">,
  options: ManuscriptAutosaveOptions,
): ManuscriptAutosave {
  const delay = options.delay ?? 700;
  let pending: string | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let flushing: Promise<void> | undefined;

  function clearTimer(): void {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  async function drain(): Promise<void> {
    clearTimer();

    while (pending !== undefined) {
      const markdown = pending;
      pending = undefined;
      options.onStateChange?.("saving");

      try {
        const result = await repository.saveManuscript(options.bookId, options.chapterId, markdown);
        options.onSaved?.(result);
      } catch (reason) {
        pending ??= markdown;
        const error =
          reason instanceof Error ? reason : new Error("The manuscript could not be saved.");
        options.onStateChange?.("error", error);
        throw error;
      }
    }

    options.onStateChange?.("saved");
  }

  async function flush(): Promise<void> {
    clearTimer();
    if (!flushing) {
      flushing = drain().finally(() => {
        flushing = undefined;
      });
    }
    await flushing;
    if (pending !== undefined) {
      await flush();
    }
  }

  function schedule(markdown: string): void {
    pending = markdown;
    options.onStateChange?.("dirty");
    clearTimer();
    timer = setTimeout(() => {
      void flush().catch(() => {
        // The visible error state is delivered through onStateChange.
      });
    }, delay);
  }

  function cancel(): void {
    clearTimer();
    pending = undefined;
    options.onStateChange?.("clean");
  }

  return { schedule, flush, cancel };
}
