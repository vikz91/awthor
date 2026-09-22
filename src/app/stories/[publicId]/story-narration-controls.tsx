"use client";

import { Headphones, LoaderCircle, Pause, Play, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { type LanguageChoice, makePassages, preparationLabel, ttsModels } from "@/lib/tts/models";
import { MmsPlayer, type PlayerState } from "@/lib/tts/player";

type Props = { getText: () => string; bookLanguage: string };

export function StoryNarrationControls({ getText, bookLanguage }: Props) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<PlayerState>({ status: "paused" });
  const [rate, setRate] = useState(1);
  const [language, setLanguage] = useState<LanguageChoice>("auto");
  const player = useRef<MmsPlayer | null>(null);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) player.current?.pause();
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      player.current?.dispose();
      player.current = null;
    };
  }, []);

  function start(choice = language) {
    setExpanded(true);
    player.current?.dispose();
    player.current = null;
    try {
      if (typeof Worker === "undefined" || typeof WebAssembly === "undefined") {
        throw new Error("On-device narration is not supported in this browser.");
      }
      const passages = makePassages(getText(), bookLanguage, choice);
      if (!passages.length) throw new Error("There is no story text to read yet.");
      setState({ status: "preparing" });
      player.current = new MmsPlayer(passages, setState);
      player.current.start(rate);
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Couldn’t start narration. Try again.",
      });
    }
  }

  function close() {
    player.current?.dispose();
    player.current = null;
    setExpanded(false);
    setState({ status: "paused" });
  }

  const active = state.status === "playing" || state.status === "preparing";
  const message =
    state.message ??
    (state.status === "preparing"
      ? preparationLabel(state.progress ?? {})
      : state.status === "finished"
        ? "Finished. Listen again anytime."
        : state.status === "paused"
          ? "Paused"
          : "Playing on your device");

  return (
    <div className="sticky top-3 z-20 mx-auto mt-6 w-fit max-w-full">
      {!expanded ? (
        <Button
          onClick={() => start()}
          size="sm"
          type="button"
          variant="outline"
          aria-expanded={false}
          aria-controls={id}
        >
          <Headphones aria-hidden="true" /> Listen
        </Button>
      ) : (
        <section
          aria-label="Story narration"
          className="w-80 max-w-full rounded-xl border border-border bg-card p-3 text-card-foreground shadow-sm"
          id={id}
        >
          <div className="flex items-center gap-3">
            <Button
              aria-label={active ? "Pause narration" : "Play narration"}
              onClick={() => {
                if (active) player.current?.pause();
                else if (!player.current || state.status === "error") start();
                else player.current.play();
              }}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              {active ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            </Button>
            <div className="min-w-0 flex-1">
              <label className="flex justify-between text-xs" htmlFor={`${id}-speed`}>
                <span>Speed</span>
                <span className="tabular-nums">{rate}×</span>
              </label>
              <input
                aria-valuetext={`${rate} times normal speed`}
                className="block h-6 w-full cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                id={`${id}-speed`}
                min={0.5}
                max={2}
                step={0.5}
                type="range"
                value={rate}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setRate(next);
                  player.current?.setRate(next);
                }}
              />
              <div
                aria-hidden="true"
                className="flex justify-between text-[0.6rem] tabular-nums text-muted-foreground"
              >
                <span>0.5×</span>
                <span>1×</span>
                <span>1.5×</span>
                <span>2×</span>
              </div>
            </div>
            <Button
              aria-label="Close narration"
              onClick={close}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <output className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
              {state.status === "preparing" ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-3 animate-spin motion-reduce:animate-none"
                />
              ) : null}
              {message}
            </output>
            <label className="sr-only" htmlFor={`${id}-language`}>
              Narration language
            </label>
            <select
              className="max-w-full rounded-md border border-border bg-background px-1.5 py-1 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              id={`${id}-language`}
              value={language}
              onChange={(event) => {
                const next = event.target.value as LanguageChoice;
                setLanguage(next);
                start(next);
              }}
            >
              <option value="auto">Auto language</option>
              {Object.entries(ttsModels).map(([code, model]) => (
                <option key={code} value={code}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>
          {state.status === "preparing" ? (
            <p className="mt-1 text-[0.6rem] text-muted-foreground">
              First use downloads a voice (~38 MB). Keep this page open.
            </p>
          ) : null}
        </section>
      )}
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
