"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  localNarrationVoice,
  type NarrationState,
  StoryNarration,
  splitNarration,
} from "@/lib/story-narration";

type Props = { getText: () => string };

export function StoryNarrationControls({ getText }: Props) {
  const speedId = useId();
  const [availability, setAvailability] = useState("Loading on-device voices…");
  const [state, setState] = useState<NarrationState>("idle");
  const [rate, setRate] = useState(1);
  const player = useRef<StoryNarration | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setAvailability("Read aloud is not supported in this browser.");
      return;
    }
    const synth = window.speechSynthesis;
    const updateVoices = () => {
      const voice = localNarrationVoice(synth.getVoices(), document.documentElement.lang || "en");
      setAvailability(
        voice
          ? ""
          : "No on-device voice available. Install a voice in your device’s speech settings.",
      );
    };
    updateVoices();
    synth.addEventListener("voiceschanged", updateVoices);
    // Refresh after returning from system settings, including browsers without voiceschanged.
    window.addEventListener("focus", updateVoices);
    const pauseWhenHidden = () => {
      if (document.hidden && player.current) player.current.pause();
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      synth.removeEventListener("voiceschanged", updateVoices);
      window.removeEventListener("focus", updateVoices);
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      player.current?.dispose();
      player.current = null;
    };
  }, []);

  function toggle() {
    if (state === "playing") {
      player.current?.pause();
      return;
    }
    if (!player.current) {
      const synth = window.speechSynthesis;
      const voice = localNarrationVoice(synth.getVoices(), document.documentElement.lang || "en");
      if (!voice) {
        setAvailability(
          "No on-device voice available. Install a voice in your device’s speech settings.",
        );
        return;
      }
      const chunks = splitNarration(getText());
      if (!chunks.length) {
        setState("error");
        return;
      }
      player.current = new StoryNarration(
        synth,
        (text) => new SpeechSynthesisUtterance(text),
        chunks,
        voice,
        setState,
      );
      player.current.setRate(rate);
    }
    player.current.play();
  }

  const message =
    availability ||
    (state === "error"
      ? "Playback stopped. Tap Play to try again."
      : state === "finished"
        ? "Story finished. Play again anytime."
        : state === "paused"
          ? "Paused. Play resumes from the current passage."
          : "On-device narration · Keep this page open while listening.");

  return (
    <div className="sticky top-3 z-20 mx-auto mt-6 max-w-md rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-sm sm:p-4">
      <div className="flex items-center gap-4">
        <Button
          aria-label={state === "playing" ? "Pause narration" : "Play narration"}
          disabled={Boolean(availability)}
          onClick={toggle}
          size="sm"
          type="button"
        >
          {state === "playing" ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          {state === "playing" ? "Pause" : "Play"}
        </Button>
        <div className="min-w-0 flex-1">
          <label className="mb-1 flex justify-between text-xs font-medium" htmlFor={speedId}>
            <span>Reading speed</span>
            <span>{rate}×</span>
          </label>
          <input
            aria-valuetext={`${rate} times normal speed`}
            className="block h-6 w-full cursor-pointer accent-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
            disabled={Boolean(availability)}
            id={speedId}
            max={2}
            min={0.5}
            onChange={(event) => {
              const next = Number(event.target.value);
              setRate(next);
              player.current?.setRate(next);
            }}
            step={0.5}
            type="range"
            value={rate}
          />
          <div
            aria-hidden="true"
            className="flex justify-between text-[0.65rem] tabular-nums text-muted-foreground"
          >
            <span>0.5×</span>
            <span>1×</span>
            <span>1.5×</span>
            <span>2×</span>
          </div>
        </div>
      </div>
      <p aria-live="polite" className="mt-2 text-xs leading-5 text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

/** Read rendered content so Markdown markers, link URLs and page furniture stay silent. */
export function renderedNarrationText(element: Element): string {
  if (["IMG", "SCRIPT", "STYLE"].includes(element.tagName)) return "";
  if (element.tagName === "BR") return "\n";
  const text = Array.from(element.childNodes, (node) =>
    node.nodeType === Node.TEXT_NODE
      ? (node.textContent ?? "")
      : node instanceof Element
        ? renderedNarrationText(node)
        : "",
  ).join("");
  if (element.tagName === "TD" || element.tagName === "TH") return `${text} `;
  return /^(P|H[1-6]|LI|BLOCKQUOTE|PRE|TR|DIV|HEADER|SECTION)$/.test(element.tagName)
    ? `${text}\n`
    : text;
}
