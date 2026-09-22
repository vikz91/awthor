import type { AudioManifest } from "./chunks";

export type PlaybackState = { playing: boolean; chapterId: string; message: string };
export class AudioPlaylist {
  private tracks: { chapterId: string; url: string }[];
  private index = 0;
  private audio: HTMLAudioElement | undefined;
  private next: HTMLAudioElement | undefined;
  private rate = 1;
  private wantsPlay = false;
  private disposed = false;

  constructor(
    manifest: Pick<AudioManifest, "chapters">,
    private onState: (state: PlaybackState) => void,
    private createAudio = () => new Audio(),
  ) {
    this.tracks = manifest.chapters.flatMap((chapter) =>
      chapter.chunks.map((chunk) => ({ chapterId: chapter.chapterId, url: chunk.url })),
    );
  }
  private report(message: string, playing = this.wantsPlay) {
    if (!this.disposed)
      this.onState({ message, playing, chapterId: this.tracks[this.index]?.chapterId ?? "" });
  }
  private release(audio: HTMLAudioElement | undefined) {
    if (!audio) return;
    audio.onplaying = audio.onpause = audio.onwaiting = audio.onended = audio.onerror = null;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
  private prepare(index: number) {
    if (!this.tracks[index]) return undefined;
    const audio = this.createAudio();
    audio.preload = "auto";
    audio.src = this.tracks[index].url;
    audio.playbackRate = this.rate;
    audio.preservesPitch = true;
    return audio;
  }
  private activate(index: number) {
    const prepared = index === this.index + 1 ? this.next : undefined;
    this.release(this.audio);
    if (this.next !== prepared) this.release(this.next);
    this.index = index;
    this.audio = prepared ?? this.prepare(index);
    this.next = this.prepare(index + 1);
    const audio = this.audio;
    if (!audio) return;
    audio.onplaying = () => {
      if (!this.wantsPlay) audio.pause();
      else this.report("Playing");
    };
    audio.onpause = () => {
      if (!this.wantsPlay) this.report("Paused", false);
    };
    audio.onwaiting = () => this.report("Loading audio…");
    audio.onerror = () => {
      this.wantsPlay = false;
      this.report("Could not load this part. Tap Play to retry.", false);
    };
    audio.onended = () => {
      if (this.disposed) return;
      if (this.index + 1 === this.tracks.length) {
        this.wantsPlay = false;
        this.report("Finished. Listen again anytime.", false);
        return;
      }
      this.activate(this.index + 1);
      if (this.wantsPlay) void this.play();
    };
  }
  async play() {
    if (this.disposed) return;
    this.wantsPlay = true;
    if (!this.audio) this.activate(this.index);
    else if (this.audio.ended && this.index === this.tracks.length - 1) this.activate(0);
    const audio = this.audio;
    if (!audio) return;
    if (audio.error) audio.load();
    this.report("Loading audio…");
    try {
      await audio.play();
      if (this.disposed || audio !== this.audio || !this.wantsPlay) audio.pause();
    } catch {
      if (!this.disposed && audio === this.audio) {
        this.wantsPlay = false;
        this.report("Tap Play to start audio.", false);
      }
    }
  }
  pause() {
    this.wantsPlay = false;
    this.audio?.pause();
    this.report("Paused", false);
  }
  selectChapter(chapterId: string) {
    const index = this.tracks.findIndex((track) => track.chapterId === chapterId);
    if (this.disposed || index < 0) return;
    this.activate(index);
    void this.play();
  }
  setRate(rate: number) {
    if (![0.5, 1, 1.5, 2].includes(rate)) return;
    this.rate = rate;
    for (const audio of [this.audio, this.next]) if (audio) audio.playbackRate = rate;
  }
  dispose() {
    this.disposed = true;
    this.wantsPlay = false;
    this.release(this.audio);
    this.release(this.next);
  }
}
