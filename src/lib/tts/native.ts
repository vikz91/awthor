import "server-only";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { env, LogLevel, pipeline, type TextToAudioPipeline } from "@huggingface/transformers";
import { AUDIO_CONCURRENCY } from "./config";
import { repairKannadaModel } from "./kannada-model";
import { type Passage, type TtsLanguage, ttsModels } from "./models";
import { NarrationWav } from "./wav";

env.allowLocalModels = false;
// Library execution errors can otherwise include manuscript token IDs in logs.
env.logLevel = LogLevel.NONE;
const originalFetch = env.fetch;
const repairedName = "model_awthor_padding_v1_quantized.onnx";
env.fetch = async (input, init) => {
  const url = String(input);
  if (!url.endsWith(`/${repairedName}`)) return originalFetch(input, init);
  const model = ttsModels.kn;
  if (url !== `https://huggingface.co/${model.id}/resolve/${model.revision}/onnx/${repairedName}`)
    throw new Error("Unexpected model URL");
  const response = await originalFetch(url.replace(repairedName, "model_quantized.onnx"), init);
  if (!response.ok) throw new Error("Kannada model download failed");
  const bytes = await repairKannadaModel(new Uint8Array(await response.arrayBuffer()));
  return new Response(bytes, {
    headers: { "Content-Type": "application/octet-stream", "Content-Length": String(bytes.length) },
  });
};
// Native ONNX needs file paths. Keep only each slot’s active voice on ephemeral disk.
env.useFSCache = true;

// Independent sessions allow concurrent invocations in a Fluid Compute instance.
const slots: { busy: boolean; synthesizer?: TextToAudioPipeline; language?: TtsLanguage }[] =
  Array.from({ length: AUDIO_CONCURRENCY }, () => ({ busy: false }));

export class AudioCapacityError extends Error {}

export async function synthesizeChunk(passages: Passage[]) {
  const slot = slots.find((value) => !value.busy);
  if (!slot) throw new AudioCapacityError("The audio server is busy. Retry this chunk shortly.");
  slot.busy = true;
  try {
    const start = Date.now();
    const cacheDir = join(tmpdir(), `awthor-mms-${process.pid}`, String(slots.indexOf(slot)));
    const wav = new NarrationWav();
    for (const passage of passages) {
      if (Date.now() - start > 230_000)
        throw new Error("This chunk exceeded the generation time limit.");
      if (!slot.synthesizer || slot.language !== passage.language) {
        await slot.synthesizer?.dispose();
        slot.synthesizer = undefined;
        slot.language = undefined;
        await rm(cacheDir, { recursive: true, force: true });
        const model = ttsModels[passage.language];
        slot.synthesizer = await pipeline("text-to-speech", model.id, {
          revision: model.revision,
          cache_dir: cacheDir,
          dtype: passage.language === "kn" ? "q8" : "fp32",
          model_file_name: passage.language === "kn" ? "model_awthor_padding_v1" : "model",
          device: "cpu",
          session_options: { intraOpNumThreads: 1, interOpNumThreads: 1 },
        });
        slot.language = passage.language;
      }
      const output = await slot.synthesizer(passage.text);
      await wav.append(output.toBlob());
    }
    const blob = wav.finish();
    const header = new DataView(await blob.slice(0, 44).arrayBuffer());
    return { blob, durationSeconds: (blob.size - 44) / header.getUint32(28, true) };
  } finally {
    slot.busy = false;
  }
}
