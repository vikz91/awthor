"use client";

import { Headphones, Pause, Play, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AudioManifest } from "@/lib/tts/chunks";
import { AudioPlaylist } from "@/lib/tts/playlist";

export function StoryNarrationControls({ chapters }: Pick<AudioManifest, "chapters">) {
  const id = useId();
  const audio = useRef<AudioPlaylist | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState("Paused");
  const [chapterId, setChapterId] = useState(chapters[0]?.chapterId ?? "");
  const [rate, setRate] = useState(1);

  useEffect(
    () => () => {
      audio.current?.dispose();
      audio.current = null;
    },
    [],
  );

  function play() {
    setExpanded(true);
    if (!audio.current)
      audio.current = new AudioPlaylist({ chapters }, (state) => {
        setPlaying(state.playing);
        setMessage(state.message);
        setChapterId(state.chapterId);
      });
    audio.current.setRate(rate);
    void audio.current.play();
  }

  return (
    <div className="sticky top-3 z-20 mx-auto mt-6 w-fit max-w-full">
      {!expanded ? (
        <Button
          aria-controls={id}
          aria-expanded={false}
          onClick={() => void play()}
          size="sm"
          variant="outline"
        >
          <Headphones aria-hidden="true" />
          Listen
        </Button>
      ) : (
        <section
          id={id}
          aria-label="Story narration"
          className="w-80 max-w-full rounded-xl border border-border bg-card p-3 text-card-foreground shadow-sm"
        >
          <div className="flex items-center gap-3">
            <Button
              aria-label={playing ? "Pause narration" : "Play narration"}
              size="icon-sm"
              variant="outline"
              onClick={() => {
                if (playing) audio.current?.pause();
                else void play();
              }}
            >
              {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            </Button>
            <div className="min-w-0 flex-1">
              <label htmlFor={`${id}-speed`} className="flex justify-between text-xs">
                <span>Speed</span>
                <span>{rate}×</span>
              </label>
              <input
                id={`${id}-speed`}
                type="range"
                min={0.5}
                max={2}
                step={0.5}
                value={rate}
                aria-valuetext={`${rate} times normal speed`}
                className="block h-6 w-full cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setRate(next);
                  audio.current?.setRate(next);
                }}
              />
              <div
                aria-hidden="true"
                className="flex justify-between text-[0.6rem] text-muted-foreground"
              >
                <span>0.5×</span>
                <span>1×</span>
                <span>1.5×</span>
                <span>2×</span>
              </div>
            </div>
            <Button
              aria-label="Close narration"
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                audio.current?.dispose();
                audio.current = null;
                setExpanded(false);
                setPlaying(false);
              }}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
          <label htmlFor={`${id}-chapter`} className="mt-3 block text-xs text-muted-foreground">
            Chapter
          </label>
          <select
            id={`${id}-chapter`}
            value={chapterId}
            className="mt-1 w-full min-w-0 rounded-md border border-border bg-background p-1.5 text-xs text-foreground focus-visible:outline-ring"
            onChange={(event) => audio.current?.selectChapter(event.target.value)}
          >
            {chapters.map((chapter, index) => (
              <option key={chapter.chapterId} value={chapter.chapterId}>
                {index + 1}. {chapter.title}
              </option>
            ))}
          </select>
          <output className="mt-3 block text-[0.65rem] text-muted-foreground">{message}</output>
        </section>
      )}
    </div>
  );
}
