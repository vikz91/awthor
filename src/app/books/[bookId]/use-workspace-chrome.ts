"use client";

import { type RefObject, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  WorkspaceChromeController,
  type WorkspaceChromeScrollMetrics,
} from "@/lib/workspace-scroll-chrome";

type UseWorkspaceChromeInput = {
  chapterId: string | null;
  disabled: boolean;
  heldOpen: boolean;
  targetRef: RefObject<HTMLElement | null>;
};

export function useWorkspaceChrome({
  chapterId,
  disabled,
  heldOpen,
  targetRef,
}: UseWorkspaceChromeInput) {
  const controller = useMemo(() => new WorkspaceChromeController(), []);
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  useEffect(() => {
    controller.setInteraction("workspace-overlay", !disabled && heldOpen);
    return () => controller.setInteraction("workspace-overlay", false);
  }, [controller, disabled, heldOpen]);

  useEffect(() => {
    if (disabled || !chapterId) {
      controller.suspend();
      return;
    }

    const scrollingElement = document.scrollingElement;
    if (!scrollingElement) {
      controller.suspend();
      return;
    }

    let frame: number | null = null;
    const readMetrics = (): WorkspaceChromeScrollMetrics => ({
      scrollHeight: scrollingElement.scrollHeight,
      scrollTop: scrollingElement.scrollTop,
      viewportHeight: window.innerHeight,
    });
    const update = () => {
      frame = null;
      controller.updateScroll(readMetrics());
    };
    const scheduleUpdate = () => {
      if (frame === null) {
        frame = requestAnimationFrame(update);
      }
    };

    controller.openChapter(readMetrics());
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    if (targetRef.current) {
      resizeObserver.observe(targetRef.current);
    }
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });

    return () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate);
    };
  }, [chapterId, controller, disabled, targetRef]);

  useEffect(() => () => controller.destroy(), [controller]);

  return {
    ...snapshot,
    reveal: controller.reveal,
    setInteraction: controller.setInteraction,
  };
}
