import { env, pipeline, type TextToAudioPipeline } from "@huggingface/transformers";
import { repairKannadaModel } from "./kannada-model";
import { downloadEstimate, type TtsLanguage, ttsModels } from "./models";
import type { TtsRequest, TtsResponse } from "./protocol";

env.allowLocalModels = false;
env.useBrowserCache = true;
// One CPU worker works without cross-origin isolation and keeps inference off the UI thread.
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;

let synthesizer: TextToAudioPipeline | undefined;
let language: TtsLanguage | undefined;
let queue = Promise.resolve();
const reply = (message: TtsResponse) => self.postMessage(message);
let preparingId = 0;

const originalFetch = env.fetch;
// A distinct filename keeps repaired assets separate from any cached upstream export.
const kannadaFilename = "model_awthor_padding_v1_quantized.onnx";
env.fetch = async (input, init) => {
  const url = String(input);
  if (!url.endsWith(`/${kannadaFilename}`)) return originalFetch(input, init);
  const model = ttsModels.kn;
  const expected = `https://huggingface.co/${model.id}/resolve/${model.revision}/onnx/${kannadaFilename}`;
  if (url !== expected) throw new Error("Unexpected Kannada model URL");
  const response = await originalFetch(url.replace(kannadaFilename, "model_quantized.onnx"), init);
  if (!response.ok || !response.body) throw new Error("Kannada model download failed");
  const bytes = new Uint8Array(model.bytes);
  const reader = response.body.getReader();
  const started = performance.now();
  let loaded = 0;
  let lastUpdate = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (loaded + value.length > bytes.length) throw new Error("Unexpected model size");
      bytes.set(value, loaded);
      loaded += value.length;
      const now = performance.now();
      if (now - lastUpdate > 300) {
        lastUpdate = now;
        reply({
          id: preparingId,
          type: "progress",
          progress: downloadEstimate(loaded, bytes.length, now - started),
        });
      }
    }
  } finally {
    reader.releaseLock();
  }
  if (loaded !== bytes.length) throw new Error("Incomplete model download");
  const repaired = await repairKannadaModel(bytes);
  return new Response(repaired, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(repaired.length),
    },
  });
};

self.onmessage = (event: MessageEvent<TtsRequest>) => {
  const { id, passage } = event.data;
  queue = queue.then(async () => {
    try {
      if (language !== passage.language || !synthesizer) {
        await synthesizer?.dispose();
        synthesizer = undefined;
        language = undefined;
        const model = ttsModels[passage.language];
        preparingId = id;
        let started = 0;
        let lastUpdate = 0;
        reply({ id, type: "progress", progress: {} });
        synthesizer = await pipeline("text-to-speech", model.id, {
          revision: model.revision,
          dtype: "q8",
          device: "wasm",
          model_file_name: passage.language === "kn" ? "model_awthor_padding_v1" : "model",
          progress_callback: (info) => {
            if (info.status !== "progress" || !info.file.endsWith(".onnx")) return;
            const now = performance.now();
            if (!started) started = now;
            if (now - lastUpdate < 300 && info.loaded < info.total) return;
            lastUpdate = now;
            reply({
              id,
              type: "progress",
              progress: downloadEstimate(info.loaded, info.total || model.bytes, now - started),
            });
          },
        });
        language = passage.language;
      }
      reply({ id, type: "progress", progress: {} });
      const output = await synthesizer(passage.text);
      reply({ id, type: "audio", blob: output.toBlob() });
    } catch {
      // Do not expose library internals or manuscript text in user-facing errors.
      reply({
        id,
        type: "error",
        message: "Couldn’t prepare narration. Check your connection and try again.",
      });
    }
  });
};
