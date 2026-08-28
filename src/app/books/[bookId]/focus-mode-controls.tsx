"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type FocusModeControlsProps = {
  fallback: boolean;
  onExit: () => void;
};

const bottomRevealDistance = 96;
const exitHideDelay = 900;
const initialExitVisibility = 3000;
const toastVisibility = 5000;

export function FocusModeControls({ fallback, onExit }: FocusModeControlsProps) {
  const [coarsePointer, setCoarsePointer] = useState(false);
  const [exitVisible, setExitVisible] = useState(true);
  const [toastVisible, setToastVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showExit = useCallback(() => {
    if (initialTimerRef.current) {
      clearTimeout(initialTimerRef.current);
      initialTimerRef.current = null;
    }
    clearHideTimer();
    setExitVisible(true);
  }, [clearHideTimer]);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      setExitVisible(false);
    }, exitHideDelay);
  }, [clearHideTimer]);

  useEffect(() => {
    const media = window.matchMedia("(hover: none), (pointer: coarse)");
    const updatePointer = () => setCoarsePointer(media.matches);
    updatePointer();
    media.addEventListener("change", updatePointer);
    return () => media.removeEventListener("change", updatePointer);
  }, []);

  useEffect(() => {
    setToastVisible(true);
    const toastTimer = setTimeout(() => setToastVisible(false), toastVisibility);
    return () => clearTimeout(toastTimer);
  }, []);

  useEffect(() => {
    initialTimerRef.current = setTimeout(() => {
      initialTimerRef.current = null;
      setExitVisible(false);
    }, initialExitVisibility);

    return () => {
      if (initialTimerRef.current) {
        clearTimeout(initialTimerRef.current);
        initialTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (event.pointerType === "touch") {
        return;
      }
      if (window.innerHeight - event.clientY <= bottomRevealDistance) {
        showExit();
      } else {
        scheduleHide();
      }
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      clearHideTimer();
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [clearHideTimer, scheduleHide, showExit]);

  return (
    <>
      {toastVisible ? (
        <output className="pointer-events-none fixed top-5 left-1/2 z-60 w-[min(30rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-border/80 bg-popover/95 px-4 py-3 text-center text-sm text-popover-foreground shadow-xl shadow-foreground/10 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 motion-reduce:animate-none">
          {fallback ? (
            <>
              Browser fullscreen is unavailable. Distraction-free mode is still active. Press Esc or{" "}
              {coarsePointer ? "tap" : "move to"} the bottom edge to exit.
            </>
          ) : (
            <>
              Focus mode on. Press Esc or {coarsePointer ? "tap" : "move the cursor to"} the bottom
              edge to exit.
            </>
          )}
        </output>
      ) : null}

      {coarsePointer && !exitVisible ? (
        <div
          aria-hidden="true"
          className="fixed inset-x-0 bottom-0 z-50 h-12"
          onPointerDown={showExit}
        />
      ) : null}

      {exitVisible ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-60 flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            aria-keyshortcuts="Escape"
            aria-label="Exit focus mode"
            className="group pointer-events-auto size-10 rounded-full border border-border/80 bg-popover/90 text-popover-foreground shadow-lg shadow-foreground/10 backdrop-blur-xl"
            onBlur={scheduleHide}
            onClick={onExit}
            onFocus={showExit}
            onPointerEnter={showExit}
            onPointerLeave={scheduleHide}
            size="icon-lg"
            title="Exit focus mode (Esc)"
            variant="ghost"
          >
            <X
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:scale-90 group-hover:rotate-90 motion-reduce:transition-none"
            />
          </Button>
        </div>
      ) : null}
    </>
  );
}
