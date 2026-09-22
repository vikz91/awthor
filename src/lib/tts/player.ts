import type { Passage, Preparation } from "./models";
import type { TtsRequest, TtsResponse } from "./protocol";

export type PlayerState = {
  status: "preparing" | "playing" | "paused" | "finished" | "error";
  progress?: Preparation;
  message?: string;
};

type PendingAudio = {
  promise: Promise<Blob>;
  resolve: (blob: Blob) => void;
  reject: (error: Error) => void;
};

/** A bounded queue: only the current passage and one look-ahead are kept in memory. */
export class MmsPlayer {
  private worker: Worker;
  private audio: HTMLAudioElement;
  private requests = new Map<number, PendingAudio>();
  private index = 0;
  private loadedIndex = -1;
  private url: string | undefined;
  private rate = 1;
  private wantsPlayback = true;
  private disposed = false;
  private loading = false;
  private timeout: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private passages: Passage[],
    private onState: (state: PlayerState) => void,
    dependencies?: { worker: Worker; audio: HTMLAudioElement },
  ) {
    this.worker =
      dependencies?.worker ??
      new Worker(new URL("./narration.worker.ts", import.meta.url), { type: "module" });
    this.audio = dependencies?.audio ?? new Audio();
    this.audio.preload = "auto";
    this.audio.onended = () => {
      if (this.loadedIndex !== this.index || this.disposed) return;
      this.requests.delete(this.index);
      this.index += 1;
      this.loadedIndex = -1;
      if (this.wantsPlayback) void this.advance();
    };
    this.audio.onerror = () => this.fail("Couldn’t play this audio. Tap Play to retry.");
    this.worker.onmessage = (event: MessageEvent<TtsResponse>) => {
      if (this.disposed) return;
      const data = event.data;
      if (data.id === this.index) this.resetTimeout();
      if (
        data.type === "progress" &&
        data.id === this.index &&
        this.wantsPlayback &&
        this.loadedIndex !== this.index
      ) {
        this.onState({ status: "preparing", progress: data.progress });
      } else if (data.type === "audio") {
        this.requests.get(data.id)?.resolve(data.blob);
      } else if (data.type === "error") {
        this.requests.get(data.id)?.reject(new Error(data.message));
      }
    };
    this.worker.onerror = () =>
      this.fail(
        "Narration couldn’t start in this browser. Close and retry, or try another browser.",
      );
    this.worker.onmessageerror = () => this.fail("Narration stopped. Close and try again.");
  }

  /** Called directly from the reader’s tap, before downloads, to unlock mobile audio. */
  start(rate: number) {
    this.setRate(rate);
    this.audio.src =
      "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQIAAAAAAA==";
    void this.audio.play().catch(() => {});
    void this.advance();
  }

  play() {
    if (this.disposed) return;
    this.wantsPlayback = true;
    if (this.index >= this.passages.length) this.index = 0;
    if (this.loadedIndex === this.index) void this.playAudio();
    else if (!this.loading) void this.advance();
    else this.onState({ status: "preparing" });
  }

  pause() {
    if (this.disposed) return;
    this.wantsPlayback = false;
    this.audio.pause();
    this.onState({ status: "paused" });
  }

  setRate(rate: number) {
    if (![0.5, 1, 1.5, 2].includes(rate)) return;
    this.rate = rate;
    this.audio.playbackRate = rate;
    this.audio.preservesPitch = true;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    clearTimeout(this.timeout);
    this.audio.onended = null;
    this.audio.onerror = null;
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.worker.terminate();
    for (const request of this.requests.values()) request.reject(new Error("Cancelled"));
    this.requests.clear();
    if (this.url) URL.revokeObjectURL(this.url);
  }

  private request(index: number): Promise<Blob> {
    const existing = this.requests.get(index);
    if (existing) return existing.promise;
    let resolve: PendingAudio["resolve"] = () => {};
    let reject: PendingAudio["reject"] = () => {};
    const promise = new Promise<Blob>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    // Look-ahead failures are surfaced when that passage becomes current.
    void promise.catch(() => {});
    this.requests.set(index, { promise, resolve, reject });
    this.worker.postMessage({ id: index, passage: this.passages[index] } satisfies TtsRequest);
    return promise;
  }

  private async advance() {
    if (this.disposed || this.loading) return;
    if (this.index >= this.passages.length) {
      this.wantsPlayback = false;
      this.onState({ status: "finished" });
      return;
    }
    this.loading = true;
    this.onState({ status: "preparing" });
    this.resetTimeout();
    try {
      const blob = await this.request(this.index);
      if (this.disposed) return;
      clearTimeout(this.timeout);
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = URL.createObjectURL(blob);
      this.audio.src = this.url;
      this.audio.playbackRate = this.rate;
      this.loadedIndex = this.index;
      if (this.wantsPlayback) await this.playAudio();
      if (this.index + 1 < this.passages.length) void this.request(this.index + 1);
    } catch (error) {
      if (!this.disposed) {
        this.requests.delete(this.index);
        this.fail(
          error instanceof Error ? error.message : "Couldn’t prepare narration. Try again.",
        );
      }
    } finally {
      this.loading = false;
    }
  }

  private async playAudio() {
    try {
      await this.audio.play();
      if (!this.disposed && this.wantsPlayback) this.onState({ status: "playing" });
      else this.audio.pause();
    } catch {
      if (!this.disposed && this.wantsPlayback) {
        this.wantsPlayback = false;
        this.onState({ status: "paused", message: "Ready. Tap Play to listen." });
      }
    }
  }

  private resetTimeout() {
    clearTimeout(this.timeout);
    if (!this.loading) return;
    this.timeout = setTimeout(() => {
      this.fail("Preparation is taking too long. Close and retry when your connection is ready.");
      this.dispose();
    }, 120_000);
  }

  private fail(message: string) {
    if (this.disposed) return;
    clearTimeout(this.timeout);
    this.wantsPlayback = false;
    this.audio.pause();
    this.onState({ status: "error", message });
  }
}
