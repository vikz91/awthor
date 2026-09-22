# Published story narration

Publish first, then select **Generate audio** in the publish modal. The Next.js
Node.js route runs MMS using native ONNX on the server and writes each audio chunk
directly to Vercel Blob. Readers and authors no longer download or execute models.

## Chunking and progress

Chapters retain their published order. Each chapter has its own ordered chunks,
targeting a maximum of 120 words or 1,800 characters. A chunk contains smaller MMS
inference passages; sentences stay intact except for the existing 220-character
inference limit. Chapters never share a chunk. Long chapters have multiple chunks.

The browser coordinates four requests at once. MongoDB also enforces at most four
active chunk leases per story, including across tabs. A lease is tied to the job,
published version, chunk index and unique attempt ID. A timed-out invocation can be
retried after its six-minute lease expires. Completed chunks are not regenerated.

The modal reports chunks complete, chapters complete, percentage and approximate
remaining time. A chapter is complete only when all its chunks are ready. ETA starts
with “Estimating time…” and uses aggregate completion throughput, excluding work
already completed before resuming. Chunk lengths, cold starts and voice changes can
make this estimate fluctuate.

**Pause generation** stops scheduling requests. Already-running server requests may
finish and save their output. Reopen the modal and select **Resume generation** to
continue. The page must remain open to advance the queue; this version does not add a
background scheduler. Failed requests receive two automatic retries, then retain all
completed work for a manual resume. Changing language starts a new job.

## Playback

Only a complete recording matching the exact published snapshot enables **Listen**.
The saved manifest has chapter IDs, titles and ordered chunks, each with a URL and
duration. Files are not merged across chunks or chapters.

The player preloads the next chunk while playing the current one, advances across
chapters, and provides a chapter selector, Play/Pause and 0.5× / 1× / 1.5× / 2× speed.
Selecting a chapter starts its first chunk. Exact seeking inside a chapter is outside
this version. Small audio-element transition gaps and slow-network buffering remain
possible. Existing single-file recordings still play as “Full story”. Private
Read/Write pages have no narration player.

## Vercel configuration

Connect a public Vercel Blob store and configure server-only `BLOB_READ_WRITE_TOKEN`.
`BLOB_STORE_ID` may also be supplied by Vercel; the SDK uses the read/write token here.
No token is sent to the browser. MongoDB and the existing Clerk publishing allowlist
are required. Chunk requests authenticate ownership and accept only a server-planned
chunk index, never client-supplied text or storage URLs.

The chunk route uses `runtime = "nodejs"` and `maxDuration = 300`. Enable Fluid
Compute for that duration on Vercel. Externalized Transformers.js/onnxruntime-node
load native CPU bindings; no Edge runtime or GPU is used. Model weights download
from pinned Hugging Face revisions into four per-process temporary cache directories.
Each slot removes its previous voice when switching languages. Up to four model
sessions are retained per instance, using one inference thread each. Separate
requests can run concurrently even if Vercel routes them to the same instance.

English, Bengali, Hindi and Tamil use FP32. Kannada retains the checksum-verified,
repaired q8 graph because its upstream FP32 export also has invalid padding. Warm
instances reuse loaded voices; cold starts and model downloads increase latency.
Vercel CPU performance and deployment packaging need measurement on a preview
before claiming a production throughput improvement.

Outputs are mono PCM16 WAV. At 16 kHz, a minute uses approximately 1.92 MB. Each chunk
has its own Blob URL. Storage, delivery and active server CPU are subject to Vercel
plan limits and charges. There is no third-party inference provider.

Vercel references:
- https://vercel.com/docs/functions/configuring-functions/duration
- https://vercel.com/docs/functions/configuring-functions/memory
- https://vercel.com/docs/vercel-blob/using-blob-sdk

## Versioning and cleanup

Republishing clears the audio manifest and active generation job. Finalization checks
that every chunk is ready and atomically attaches the manifest only to the same
published version. An old in-flight request cannot attach to a replacement job.
Regeneration leaves the previous complete recording available until replacement.

Replaced recordings and ordinary unpublishes remove their Blob files on a best-effort
basis. Public URLs may remain cached briefly (60-second cache age); downloaded copies
cannot be recalled. Interrupted uploads, abandoned language changes, database failures,
and workspace-transaction deletions can leave unreferenced files. Periodic Blob
reconciliation/garbage collection remains outside this implementation. Reconcile
`narration/` against complete audio manifests and active generation chunks before
cleaning up old assets.

## Languages and licensing

The saved book language and native script detection support English, Hindi, Bengali,
Tamil and Kannada. An explicit override is available. Romanized text and languages
sharing scripts need manual judgment. Markdown links are read as text, excluding
URLs, image descriptions and raw HTML. Chapter titles and bodies are read in order.

MMS weights retain Meta's **CC-BY-NC-4.0** licence, separate from Awthor's AGPL source
licence. See `docs/tts-model-notices.md` for model sources, revisions and the Kannada
repair. Open-source distribution does not remove the noncommercial restriction.

## Validation

`bun test src/lib/tts src/lib/database/published-stories.test.ts` covers chunk bounds,
ordering, chapter completion, ETA, four-request scheduling, resume, WAV output,
preloading, chapter jumps and playback races. Run lint and a production build too.

`bun scripts/verify-server-audio.ts` is an explicit integration check requiring MongoDB
and Blob credentials. It creates a unique temporary Mongo collection and synthetic
audio files, exercises the real route logic and native inference with a test identity,
then removes both. It does not exercise Clerk login. It checks ownership filters,
leases, concurrency, resume, incomplete/stale finalization and manifest order. Two
concurrent synthetic English chunks took about 45 seconds locally; that is not a
Vercel performance measurement. All five voices produced native audio locally.
