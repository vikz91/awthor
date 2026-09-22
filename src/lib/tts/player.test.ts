import { describe, expect, test } from "bun:test";
import { MmsPlayer, type PlayerState } from "./player";
import type { TtsRequest, TtsResponse } from "./protocol";

function fixture() {
  const states: PlayerState[] = [];
  const sent: TtsRequest[] = [];
  const worker = {
    onmessage: null as ((event: MessageEvent<TtsResponse>) => void) | null,
    onerror: null as (() => void) | null,
    onmessageerror: null as (() => void) | null,
    terminated: false,
    postMessage: (request: TtsRequest) => sent.push(request),
    terminate() {
      this.terminated = true;
    },
  };
  const audio = {
    src: "",
    playbackRate: 1,
    preservesPitch: false,
    preload: "",
    currentTime: 0,
    paused: true,
    onended: null as (() => void) | null,
    onerror: null as (() => void) | null,
    async play() {
      this.paused = false;
    },
    pause() {
      this.paused = true;
    },
    removeAttribute() {
      this.src = "";
    },
    load() {},
  };
  const player = new MmsPlayer(
    [
      { text: "First sentence.", language: "en" },
      { text: "Second sentence.", language: "en" },
      { text: "Third sentence.", language: "en" },
    ],
    (state) => states.push(state),
    { worker: worker as unknown as Worker, audio: audio as unknown as HTMLAudioElement },
  );
  const deliver = (id: number) =>
    worker.onmessage?.({
      data: { id, type: "audio", blob: new Blob(["audio"], { type: "audio/wav" }) },
    } as MessageEvent<TtsResponse>);
  return { player, states, sent, audio, worker, deliver };
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("MMS playback lifecycle", () => {
  test("pausing during preparation does not autoplay when generation finishes", async () => {
    const f = fixture();
    try {
      f.player.start(1);
      f.player.pause();
      f.deliver(0);
      await flush();
      expect(f.states.at(-1)?.status).toBe("paused");
      expect(f.audio.paused).toBe(true);
      f.player.play();
      await flush();
      expect(f.states.at(-1)?.status).toBe("playing");
    } finally {
      f.player.dispose();
    }
  });
  test("buffers one passage ahead, resumes exactly, and applies all four speeds", async () => {
    const f = fixture();
    try {
      f.player.start(1);
      f.deliver(0);
      await flush();
      expect(f.sent.map((p) => p.id)).toEqual([0, 1]);
      f.audio.currentTime = 1.5;
      f.player.pause();
      f.player.play();
      await flush();
      expect(f.audio.currentTime).toBe(1.5);
      for (const speed of [0.5, 1, 1.5, 2]) {
        f.player.setRate(speed);
        expect(f.audio.playbackRate).toBe(speed);
      }
      f.player.setRate(3);
      expect(f.audio.playbackRate).toBe(2);
      f.deliver(1);
      f.audio.onended?.();
      await flush();
      expect(f.sent.map((p) => p.id)).toEqual([0, 1, 2]);
      f.deliver(2);
      f.audio.onended?.();
      await flush();
      f.audio.onended?.();
      await flush();
      expect(f.states.at(-1)?.status).toBe("finished");
      f.player.play();
      expect(f.sent.at(-1)?.id).toBe(0);
    } finally {
      f.player.dispose();
    }
  });
  test("closing terminates inference and ignores delayed replies", async () => {
    const f = fixture();
    f.player.start(1);
    f.player.dispose();
    const count = f.states.length;
    f.deliver(0);
    await flush();
    expect(f.states).toHaveLength(count);
    expect(f.worker.terminated).toBe(true);
    expect(f.audio.src).toBe("");
  });
  test("surfaces network errors and allows retrying the passage", async () => {
    const f = fixture();
    try {
      f.player.start(1);
      f.worker.onmessage?.({
        data: { id: 0, type: "error", message: "Network unavailable" },
      } as MessageEvent<TtsResponse>);
      await flush();
      expect(f.states.at(-1)?.status).toBe("error");
      f.player.play();
      f.deliver(0);
      await flush();
      expect(f.states.at(-1)?.status).toBe("playing");
    } finally {
      f.player.dispose();
    }
  });
});
