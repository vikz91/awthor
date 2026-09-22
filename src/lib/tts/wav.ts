export const maximumAudioBytes = 128 * 1024 * 1024;

/** Converts the worker's mono float WAVs to one portable PCM16 WAV, without silence between parts. */
export class NarrationWav {
  private chunks: Uint8Array<ArrayBuffer>[] = [];
  private bytes = 0;
  private rate = 0;

  async append(blob: Blob) {
    const source = new DataView(await blob.arrayBuffer());
    if (
      source.byteLength < 44 ||
      source.getUint16(20, true) !== 3 ||
      source.getUint16(22, true) !== 1 ||
      source.getUint16(34, true) !== 32 ||
      source.getUint32(40, true) !== source.byteLength - 44
    ) {
      throw new Error("The voice produced an unsupported audio format.");
    }
    const rate = source.getUint32(24, true);
    if (!rate || (this.rate && this.rate !== rate))
      throw new Error("Voice sample rates do not match.");
    this.rate = rate;
    const length = (source.byteLength - 44) / 4;
    if (this.bytes + length * 2 + 44 > maximumAudioBytes) {
      throw new Error(
        "This story exceeds the 128 MB audio limit. Publish shorter volumes to add narration.",
      );
    }
    const pcm = new Uint8Array(length * 2);
    const view = new DataView(pcm.buffer);
    for (let i = 0; i < length; i++) {
      const sample = source.getFloat32(44 + i * 4, true);
      if (!Number.isFinite(sample)) throw new Error("The voice produced invalid audio. Try again.");
      const bounded = Math.max(-1, Math.min(1, sample));
      view.setInt16(i * 2, bounded * (bounded < 0 ? 32768 : 32767), true);
    }
    this.chunks.push(pcm);
    this.bytes += pcm.byteLength;
  }

  finish() {
    if (!this.bytes) throw new Error("There is no audio to upload.");
    const header = new Uint8Array(44);
    const view = new DataView(header.buffer);
    for (const [offset, text] of [
      [0, "RIFF"],
      [8, "WAVEfmt "],
      [36, "data"],
    ] as const) {
      header.set(new TextEncoder().encode(text), offset);
    }
    view.setUint32(4, 36 + this.bytes, true);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, this.rate, true);
    view.setUint32(28, this.rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(40, this.bytes, true);
    const blob = new Blob([header, ...this.chunks], { type: "audio/wav" });
    this.chunks = [];
    return blob;
  }
}
