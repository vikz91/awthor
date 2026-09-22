/** Short chunks avoid long-utterance failures and bound replay after a mobile pause. */
export function splitNarration(text: string): string[] {
  const sentences = text.match(/[^.!?。！？\n]+[.!?。！？]*|[.!?。！？]+/gu) ?? [];
  return sentences.flatMap((sentence) => {
    const chunks: string[] = [];
    let rest = sentence.replace(/\s+/gu, " ").trim();
    while (rest.length > 180) {
      const space = rest.lastIndexOf(" ", 180);
      const end = space > 0 ? space : 180;
      chunks.push(rest.slice(0, end));
      rest = rest.slice(end).trim();
    }
    if (rest) chunks.push(rest);
    return chunks;
  });
}

export function localNarrationVoice(voices: SpeechSynthesisVoice[], language: string) {
  const local = voices.filter((voice) => voice.localService);
  return (
    local.find((voice) => voice.lang.toLowerCase() === language.toLowerCase()) ??
    local.find((voice) => voice.lang.split("-")[0] === language.split("-")[0]) ??
    local.find((voice) => voice.default) ??
    local[0]
  );
}

export type NarrationState = "idle" | "playing" | "paused" | "finished" | "error";

/** Cancel-and-replay works even where native pause/resume is unsupported (Android). */
export class StoryNarration {
  private index = 0;
  private generation = 0;
  private rate = 1;
  private playing = false;
  private utterance: SpeechSynthesisUtterance | null = null;

  constructor(
    private synth: Pick<SpeechSynthesis, "speak" | "cancel">,
    private createUtterance: (text: string) => SpeechSynthesisUtterance,
    private chunks: string[],
    private voice: SpeechSynthesisVoice,
    private onState: (state: NarrationState) => void,
  ) {}

  play() {
    if (this.playing || !this.chunks.length) return;
    if (this.index >= this.chunks.length) this.index = 0;
    this.playing = true;
    this.onState("playing");
    this.speak();
  }

  pause() {
    if (!this.playing) return;
    this.cancel();
    this.onState("paused");
  }

  setRate(rate: number) {
    if (![0.5, 1, 1.5, 2].includes(rate)) return;
    const restart = this.playing;
    this.cancel();
    this.rate = rate;
    if (restart) this.play();
  }

  dispose() {
    this.cancel();
  }

  private cancel() {
    this.generation += 1;
    this.playing = false;
    this.synth.cancel();
    this.utterance = null;
  }

  private speak() {
    const text = this.chunks[this.index];
    if (!text) {
      this.playing = false;
      this.utterance = null;
      this.onState("finished");
      return;
    }
    const generation = this.generation;
    const utterance = this.createUtterance(text);
    // Keep a strong reference until completion; some browsers otherwise lose callbacks.
    this.utterance = utterance;
    utterance.voice = this.voice;
    utterance.lang = this.voice.lang;
    utterance.rate = this.rate;
    utterance.onend = () => {
      if (generation !== this.generation || this.utterance !== utterance) return;
      this.index += 1;
      this.speak();
    };
    utterance.onerror = () => {
      if (generation !== this.generation || this.utterance !== utterance) return;
      this.cancel();
      this.onState("error");
    };
    try {
      this.synth.speak(utterance);
    } catch {
      this.cancel();
      this.onState("error");
    }
  }
}
