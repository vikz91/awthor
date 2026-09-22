import { expect, test } from "bun:test";
import { AudioPlaylist, type PlaybackState } from "./playlist";

class AudioDouble {
  src = "";
  preload = "";
  playbackRate = 1;
  preservesPitch = true;
  ended = false;
  error = null;
  currentTime = 0;
  paused = true;
  onplaying: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onended: (() => void) | null = null;
  onwaiting: (() => void) | null = null;
  onerror: (() => void) | null = null;
  async play() {
    this.paused = false;
    this.onplaying?.();
  }
  pause() {
    this.paused = true;
    this.onpause?.();
  }
  load() {}
  removeAttribute() {
    this.src = "";
  }
}
const chapters = [
  {
    chapterId: "a",
    title: "One",
    chunks: [
      { chunkIndex: 0, url: "a0", durationSeconds: 2 },
      { chunkIndex: 1, url: "a1", durationSeconds: 2 },
    ],
  },
  { chapterId: "b", title: "Two", chunks: [{ chunkIndex: 0, url: "b0", durationSeconds: 2 }] },
];

test("preloads one part, advances in order, jumps chapters, retains speed and resumes position", async () => {
  const audios: AudioDouble[] = [];
  const states: PlaybackState[] = [];
  const player = new AudioPlaylist(
    { chapters },
    (s) => states.push(s),
    () => {
      const a = new AudioDouble();
      audios.push(a);
      return a as unknown as HTMLAudioElement;
    },
  );
  expect(audios.length).toBe(0);
  player.setRate(1.5);
  await player.play();
  expect(audios.map((a) => a.src)).toEqual(["a0", "a1"]);
  audios[0].currentTime = 1;
  player.pause();
  await player.play();
  expect(audios[0].currentTime).toBe(1);
  audios[0].onended?.();
  expect(audios[1].paused).toBe(false);
  expect(audios[1].playbackRate).toBe(1.5);
  expect(audios[2].src).toBe("b0");
  player.selectChapter("b");
  expect(audios[2].paused).toBe(false);
  expect(states.at(-1)?.chapterId).toBe("b");
  player.dispose();
  expect(audios.every((a) => a.paused && !a.src)).toBe(true);
});

test("a late play resolution cannot restart a skipped or disposed part", async () => {
  const audios: AudioDouble[] = [];
  let resolve: () => void = () => {};
  const player = new AudioPlaylist(
    { chapters },
    () => {},
    () => {
      const a = new AudioDouble();
      if (!audios.length)
        a.play = () =>
          new Promise<void>((r) => {
            resolve = () => {
              a.paused = false;
              r();
            };
          });
      audios.push(a);
      return a as unknown as HTMLAudioElement;
    },
  );
  const pending = player.play();
  player.selectChapter("b");
  resolve();
  await pending;
  expect(audios[0].paused).toBe(true);
  player.dispose();
});
