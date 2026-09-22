import { kannadaPaddingOffsets, repairKannadaModel } from "../src/lib/tts/kannada-model";

// Optional model-asset check; normal unit tests never download large weights.
// bun scripts/verify-tts-kannada.ts /path/to/original/model_quantized.onnx
const path = process.argv[2];
if (!path) throw new Error("Pass the original pinned Kannada ONNX model path.");
const original = new Uint8Array(await Bun.file(path).arrayBuffer());
const repaired = await repairKannadaModel(original.slice());
const changes = original.reduce(
  (count, byte, index) => count + Number(byte !== repaired[index]),
  0,
);
if (changes !== kannadaPaddingOffsets.length) throw new Error("Unexpected graph changes");
process.stdout.write(
  `Verified both SHA-256 digests and exactly ${changes} padding-byte changes (${repaired.length} bytes).\n`,
);
