# Published story narration

Published `/stories/[publicId]` pages provide Play/Pause and a keyboard-accessible
speed slider with 0.5×, 1×, 1.5× and 2× stops. Private Read/Write pages do not load
these controls. Narration begins at the first chapter and continues in story order.

Speech runs in the browser using the Web Speech API. Only voices reporting
`localService: true` are selected; there is no remote fallback, API key, audio
upload, or server-side TTS. Voice quality and language availability depend on the
device. Unsupported browsers and devices without a local voice show an unavailable
message. Voice availability is refreshed when the browser regains focus.

Rendered chapter text is read once, in both seamless and paginated layouts.
Markdown punctuation, image URLs, and repeated page furniture are excluded.
Playback uses short chunks; pause/resume and speed changes restart the current
chunk to accommodate browsers without reliable native pause/resume. Playback
pauses when the page is hidden and stops on navigation away. Progress lasts only
for the current page session; background or lock-screen playback is not supported.

Validation: `bun test src/lib/story-narration.test.ts` covers local-only voice
selection, chunking, cancellation races, speed changes, replay, errors, and cleanup.
Mobile-sized browser checks do not substitute for physical iOS/Android testing.
