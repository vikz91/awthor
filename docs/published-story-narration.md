# Published story narration

Published `/stories/[publicId]` pages show one outlined **Listen** button. Opening it
starts on-device MMS narration and reveals Play/Pause, a 0.5× / 1× / 1.5× / 2× speed
slider, a small language selector, and Close. Private Read/Write pages do not import
this feature. No narration endpoint, API key, or server inference is used.

## Loading and privacy

A module worker loads Transformers.js and a pinned, quantized ONNX model only after
Listen is clicked. Model files come from Hugging Face; the ONNX WASM runtime comes
from the versioned jsDelivr URL selected by Transformers.js. These hosts receive
normal asset requests (including IP address); manuscript text never leaves the
browser for inference. Closing the player or leaving the page terminates the worker
and releases the audio URL. Browser Cache Storage is reused where available; browser
storage eviction and private-mode limits can cause downloads again.

The compact “Preparing…” label reports model-download percentage and approximate
remaining download time once at least one second of real throughput is observed.
Runtime initialization and audio generation have no fabricated ETA. A connection
stall or inference hang times out after two minutes without progress. Retry starts
a fresh worker and reuses successfully cached assets. Only one model session and
at most two audio passages are retained at once.

## Languages

The published snapshot already contains `book.language`; no schema or API change
is needed. Names, native names, ISO codes and locale forms are recognized for
English, Hindi, Bengali, Tamil and Kannada. In Auto mode, native script detection
selects the model for each short passage, overcoming the historical English book
default. The saved language supplies the fallback for passages without detectable
letters. Explicitly unsupported book languages show a language-selection message
instead of silently choosing English.

Script identification is a heuristic, not universal language identification:
Devanagari also represents languages other than Hindi, Bengali script can represent
Assamese, and Latin script does not establish English. Romanized Indian text and
language mixing within a sentence are not reliably identified. The reader can force
one of the five languages; changing it restarts narration. MMS is trained on native
scripts, so selecting Bengali for romanized Bengali does not provide transliteration
or guarantee useful pronunciation. Mixed-language passages work best when separated
by sentence punctuation. Automatic switching can download more than one voice.

| Language | ONNX model | Quantized bytes |
| --- | --- | ---: |
| English | Xenova/mms-tts-eng | 38,361,643 |
| Hindi | Xenova/mms-tts-hin | 38,368,171 |
| Bengali | payam1394/traxlate-mms-tts-ben | 38,303,469 |
| Tamil | payam1394/traxlate-mms-tts-tam | 38,300,398 |
| Kannada | onnx-community/mms-tts-kan-ONNX | 37,744,174 |

Immutable repository revisions are pinned in `src/lib/tts/models.ts`. These are
community ONNX conversions of Meta's corresponding `facebook/mms-tts-*` checkpoints;
no remote custom model code is executed.
The Kannada export needs a narrowly scoped, checksum-verified graph-padding repair
before inference; its repaired bytes use a separate versioned cache filename. Inference explicitly selects q8 and WASM
with one thread, so it does not require WebGPU or cross-origin isolation. We do not
bundle model weights in the app or download every language at startup.

## Playback

Narration reads rendered chapter titles and body text once, including in Pages
layout. UI chapter labels, Markdown markers, image URLs, and page furniture are
excluded. Short passages bound inference memory; the next passage is prepared while
the current one plays. Native audio pause resumes from the same position, and the
speed slider uses pitch-preserving audio playback. Browser autoplay restrictions can
require another Play tap after preparation. Hiding the page pauses playback;
lock-screen/background listening is not promised. Position is kept only while the
player stays open. Network/inference/audio errors show a retryable message.

## Licensing

MMS weights retain Meta's **CC-BY-NC-4.0** licence, distinct from Awthor's
AGPL-3.0-only source licence. Open-source distribution does not remove the model's
noncommercial restriction. Model attribution, licence and modification notices are
in `docs/tts-model-notices.md`. Downstream commercial deployments need a compatible
model licence or separate permission.

## Validation

`bun scripts/verify-tts-kannada.ts /path/to/model_quantized.onnx` verifies the
original and repaired Kannada checksums and exactly twelve changed bytes.

`bun test src/lib/tts` covers language selection, chunking, honest download ETA,
preparation cancellation, exact audio resume, bounded look-ahead, speed selection,
completion/replay, retry and disposal. Browser testing uses a temporary local fixture
with the real public-reader component and synthetic text; no production story or
database is changed. Mobile viewport checks do not replace real iOS/Android tests.

### Measured build (2026-09-22)

The production build emits approximately 162 KB gzip of worker JavaScript including
its loader/runtime chunks. The emitted WASM asset is 26.86 MB raw / 6.60 MB gzip;
its runtime module is about 39 KB gzip. The public-reader chunk containing controls
is 14.54 KB gzip **including the reader's other UI**, so that number is not the
standalone controls delta. Model downloads remain separate, about 38 MB per language.
The application bundle contains no model weights, and worker code is not executed
before Listen. Transfer compression depends on the asset host.

Real Chrome browser checks completed synthetic English, Bengali, Tamil, Hindi and
repaired Kannada narration, plus paginated Kannada playback. Paper/Stone layouts
were inspected at mobile, tablet and desktop widths. These checks establish runtime
compatibility on this machine, not native-speaker pronunciation quality or measured
physical-phone performance.
