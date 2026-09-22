import { expect, test } from "bun:test";
import { NarrationWav } from "./wav";

function floatWav(samples: number[], rate = 16000) {
  const buffer = new ArrayBuffer(44 + samples.length * 4);
  const view = new DataView(buffer);
  view.setUint16(20, 3, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint16(34, 32, true);
  view.setUint32(40, samples.length * 4, true);
  samples.forEach((value, index) => {
    view.setFloat32(44 + index * 4, value, true);
  });
  return new Blob([buffer]);
}

test("joins generated passages into a single PCM recording with no inserted gap", async () => {
  const wav = new NarrationWav();
  await wav.append(floatWav([-1, 0, 1]));
  await wav.append(floatWav([0.5, -0.5]));
  const blob = wav.finish();
  const result = new DataView(await blob.arrayBuffer());
  expect(blob.type).toBe("audio/wav");
  expect(blob.size).toBe(54);
  expect(result.getUint32(4, true)).toBe(46);
  expect(result.getUint16(20, true)).toBe(1);
  expect(result.getUint32(24, true)).toBe(16000);
  expect(result.getUint32(40, true)).toBe(10);
  expect(Array.from({ length: 5 }, (_, index) => result.getInt16(44 + index * 2, true))).toEqual([
    -32768, 0, 32767, 16383, -16384,
  ]);
});

test("rejects empty, invalid, nonfinite and incompatible recordings", async () => {
  const wav = new NarrationWav();
  expect(() => wav.finish()).toThrow("no audio");
  expect(wav.append(new Blob(["bad"]))).rejects.toThrow("unsupported");
  expect(wav.append(floatWav([NaN]))).rejects.toThrow("invalid");
  await wav.append(floatWav([0]));
  expect(wav.append(floatWav([0], 22050))).rejects.toThrow("sample rates");
});
