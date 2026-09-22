"use client";

import { Headphones } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { type GenerationProgress, progressFromJob } from "@/lib/tts/generate";
import { type LanguageChoice, ttsModels } from "@/lib/tts/models";

export function PublishAudio({
  bookId,
  disabled,
  onBusy,
}: {
  bookId: string;
  disabled: boolean;
  onBusy: (busy: boolean) => void;
}) {
  const id = useId();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [resumable, setResumable] = useState(false);
  const [ready, setReady] = useState(false);
  const [language, setLanguage] = useState<LanguageChoice>("auto");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    percent: 0,
    message: "Checking audio storage…",
  });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const request = new AbortController();
    void fetch(`/api/publish/${encodeURIComponent(bookId)}/audio`, {
      signal: request.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        setAvailable(data.configured);
        setReady(data.ready);
        setResumable(Boolean(data.job));
        if (data.job) {
          setLanguage(data.job.choice);
          setProgress(progressFromJob(data.job));
          return;
        }
        setProgress({
          percent: data.ready ? 100 : 0,
          message: data.ready
            ? "Audio is ready."
            : data.configured
              ? "Add a recording for readers to listen to."
              : "Connect a public Vercel Blob store to enable audio.",
        });
      })
      .catch(() => {
        if (!request.signal.aborted)
          setProgress({
            percent: 0,
            message: "Audio status could not be loaded. Reopen this dialog to retry.",
          });
      });
    return () => {
      request.abort();
      controller.current?.abort();
    };
  }, [bookId]);

  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  async function generate() {
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    onBusy(true);
    setProgress((previous) => ({ ...previous, message: "Starting generation…" }));
    try {
      const { generatePublishedAudio } = await import("@/lib/tts/generate");
      await generatePublishedAudio(bookId, language, abort.signal, setProgress);
      setReady(true);
      setResumable(false);
    } catch (error) {
      setResumable(true);
      setProgress((previous) => ({
        ...previous,
        message: abort.signal.aborted
          ? "Paused. Completed chunks are saved; any running chunks may finish."
          : error instanceof Error
            ? error.message
            : "Audio generation failed. Try again.",
      }));
    } finally {
      controller.current = null;
      setBusy(false);
      onBusy(false);
    }
  }

  return (
    <section
      aria-label="Published audio"
      className="min-w-0 space-y-3 rounded-lg border border-border p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium">Audio narration</span>
        <label className="sr-only" htmlFor={id}>
          Narration language
        </label>
        <select
          id={id}
          value={language}
          disabled={busy || disabled}
          onChange={(event) => setLanguage(event.target.value as LanguageChoice)}
          className="min-w-0 max-w-40 rounded-md border border-border bg-background p-1 text-xs text-foreground focus-visible:outline-ring"
        >
          <option value="auto">Auto language</option>
          {Object.entries(ttsModels).map(([code, model]) => (
            <option key={code} value={code}>
              {model.label}
            </option>
          ))}
        </select>
      </div>
      <output className="block wrap-anywhere text-xs text-muted-foreground">
        {progress.message}
      </output>
      {progress.totalChunks !== undefined ? (
        <p className="text-xs tabular-nums text-muted-foreground">
          {progress.completedChunks} of {progress.totalChunks} chunks · {progress.completedChapters}{" "}
          of {progress.totalChapters} chapters complete
        </p>
      ) : null}
      {busy ? (
        <>
          <progress
            aria-label="Audio generation progress"
            className="block h-2 w-full min-w-0 overflow-hidden rounded-full border-0 bg-muted [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
            max={100}
            value={progress.percent}
          />
          <p className="text-xs text-muted-foreground">
            {progress.percent}% ·{" "}
            {progress.etaSeconds === undefined
              ? "Estimating time…"
              : progress.etaSeconds < 60
                ? "Less than a minute remaining"
                : `About ${Math.ceil(progress.etaSeconds / 60)} min remaining`}
          </p>
          <Button size="sm" variant="outline" onClick={() => controller.current?.abort()}>
            Pause generation
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || !available}
          onClick={() => void generate()}
        >
          <Headphones aria-hidden="true" />
          {resumable ? "Resume generation" : ready ? "Regenerate audio" : "Generate audio"}
        </Button>
      )}
      {!busy && available ? (
        <p className="text-xs text-muted-foreground">
          Generated on the server. Keep this page open to advance the queue; reopen it to resume.
          Listen appears when all chapters are ready.
        </p>
      ) : null}
    </section>
  );
}
