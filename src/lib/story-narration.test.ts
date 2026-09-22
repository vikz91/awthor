import { describe, expect, test } from "bun:test";
import {
  localNarrationVoice,
  type NarrationState,
  StoryNarration,
  splitNarration,
} from "./story-narration";

const voice = { localService: true, lang: "en-US", default: true } as SpeechSynthesisVoice;
function setup() {
  const spoken: SpeechSynthesisUtterance[] = [];
  const states: NarrationState[] = [];
  let cancelled = 0;
  const player = new StoryNarration(
    {
      speak: (utterance) => spoken.push(utterance),
      cancel: () => {
        cancelled++;
      },
    },
    (text) => ({ text }) as SpeechSynthesisUtterance,
    ["First sentence.", "Second sentence."],
    voice,
    (state) => states.push(state),
  );
  const end = (index: number) => {
    const utterance = spoken[index];
    utterance.onend?.call(utterance, {} as SpeechSynthesisEvent);
  };
  const error = (index: number) => {
    const utterance = spoken[index];
    utterance.onerror?.call(utterance, {} as SpeechSynthesisErrorEvent);
  };
  return { player, spoken, states, end, error, cancelled: () => cancelled };
}

describe("local narration", () => {
  test("never selects a remote voice, even when it is the default", () => {
    const remote = { ...voice, localService: false };
    expect(localNarrationVoice([remote], "en-US")).toBeUndefined();
    expect(localNarrationVoice([remote, voice], "en-US")).toBe(voice);
  });
  test("prefers a local voice matching the document language", () => {
    const french = { ...voice, lang: "fr-FR", default: false };
    expect(localNarrationVoice([voice, french], "fr-CA")).toBe(french);
  });
  test("chunks long prose and unspaced text without dropping words", () => {
    const text = "A long story ".repeat(100).trim();
    const chunks = splitNarration(text);
    expect(chunks.every((chunk) => chunk.length <= 180)).toBe(true);
    expect(chunks.join(" ")).toBe(text);
    expect(splitNarration("字".repeat(400)).join("")).toBe("字".repeat(400));
    expect(splitNarration("First.\nSecond! Third?")).toEqual(["First.", "Second!", "Third?"]);
    expect(splitNarration("   ")).toEqual([]);
  });
  test("pause cancels speech and resumes the current chunk, ignoring late callbacks", () => {
    const s = setup();
    s.player.play();
    s.player.pause();
    s.error(0);
    s.end(0);
    expect(s.states).toEqual(["playing", "paused"]);
    s.player.play();
    expect(s.spoken.map((u) => u.text)).toEqual(["First sentence.", "First sentence."]);
    s.end(1);
    expect(s.spoken[2].text).toBe("Second sentence.");
    expect(s.cancelled()).toBe(1);
  });
  test("speed changes restart only the current chunk with the selected rate", () => {
    const s = setup();
    s.player.play();
    s.player.setRate(1.5);
    s.end(0);
    expect(s.spoken).toHaveLength(2);
    expect(s.spoken[1].rate).toBe(1.5);
    expect(s.spoken[1].voice).toBe(voice);
    s.player.pause();
    s.player.setRate(0.5);
    expect(s.spoken).toHaveLength(2);
    s.player.play();
    expect(s.spoken[2].rate).toBe(0.5);
  });
  test("completion allows replay and duplicate events do not skip chunks", () => {
    const s = setup();
    s.player.play();
    s.end(0);
    s.end(0);
    expect(s.spoken).toHaveLength(2);
    s.end(1);
    expect(s.states.at(-1)).toBe("finished");
    s.player.play();
    expect(s.spoken[2].text).toBe("First sentence.");
  });
  test("errors allow retry; disposal prevents continued speech", () => {
    const s = setup();
    s.player.play();
    s.error(0);
    expect(s.states.at(-1)).toBe("error");
    s.player.play();
    s.player.dispose();
    s.end(1);
    expect(s.spoken).toHaveLength(2);
  });
});
