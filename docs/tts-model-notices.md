# MMS model attribution

Awthor downloads modified ONNX / quantized copies of **Massively Multilingual Speech
(MMS) text-to-speech models**, originally published by **Meta / Facebook**. The
models are separate assets and are not licensed under Awthor's source-code licence.

- Original models: https://huggingface.co/facebook/mms-tts-eng,
  https://huggingface.co/facebook/mms-tts-hin,
  https://huggingface.co/facebook/mms-tts-ben,
  https://huggingface.co/facebook/mms-tts-tam,
  https://huggingface.co/facebook/mms-tts-kan.
- Original research: *Scaling Speech Technology to 1,000+ Languages*, Pratap et al.
  (2023), https://arxiv.org/abs/2305.13516.
- Model licence: Creative Commons Attribution-NonCommercial 4.0 International,
  https://creativecommons.org/licenses/by-nc/4.0/ ; legal text:
  https://creativecommons.org/licenses/by-nc/4.0/legalcode.
- Modifications: conversion to ONNX and quantization by Xenova, ONNX Community,
  and payam1394. Conversion repositories and exact revisions are recorded in
  `src/lib/tts/models.ts`. Awthor performs no further weight training or modification. It repairs twelve
  incorrect convolution-padding attributes in the pinned Kannada ONNX graph.

Keep these attribution, licence and modification notices with redistributed model
assets. No endorsement by Meta or the conversion authors is implied.

## Kannada export repair

The pinned `onnx-community/mms-tts-kan-ONNX` q8 graph fails for ordinary input
lengths: each encoder feed-forward convolution has `kernel_shape=[3]` but
`pads=[1,0]`, shrinking the time axis before multiplication by its full-length mask.
Awthor changes the second pad to 1 in both convolutions of each of six layers.
All learned tensor data remains byte-identical. The graph file remains 37,744,174 bytes.

- Original SHA-256: `ff7ed92052c33c82ece808785775928b708247c3a1c530ecbea25b8b0f244c4b`
- Repaired SHA-256: `4d083bd1ebe6058dfbec21e524d6037a548806e8803fa9231f36bbcecaf9a76d`
- Byte offsets and fail-closed digest checks: `src/lib/tts/kannada-model.ts`.
- Cache filename: `model_awthor_padding_v1_quantized.onnx`, separate from upstream.

Validation included ONNX graph checking and CPU inference with sequence lengths
9, 20, 39, 51, and 101; all produced finite audio after repair and failed before it.
The server fetch adapter performs the repair once before caching. If upstream
bytes differ, it refuses the asset rather than applying offsets to an unknown graph.
