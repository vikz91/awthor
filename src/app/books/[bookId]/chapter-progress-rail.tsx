"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ChapterProgressRailProps = {
  inspectorOpen?: boolean;
  targetRef: RefObject<HTMLElement | null>;
};

type RailMetrics = {
  end: number;
  markerCount: number;
  start: number;
  totalPages: number;
};

const maximumMarkers = 9;
const topInset = 96;

export function ChapterProgressRail({
  inspectorOpen = false,
  targetRef,
}: ChapterProgressRailProps) {
  const [activeMarker, setActiveMarker] = useState(0);
  const [metrics, setMetrics] = useState<RailMetrics | null>(null);
  const metricsRef = useRef<RailMetrics | null>(null);
  const updateFrameRef = useRef<number | null>(null);

  const updateActiveMarker = useCallback(() => {
    const current = metricsRef.current;
    if (!current) {
      setActiveMarker(0);
      return;
    }

    const range = current.end - current.start;
    const progress = range <= 0 ? 0 : clamp((window.scrollY - current.start) / range, 0, 1);
    setActiveMarker(Math.round(progress * (current.markerCount - 1)));
  }, []);

  const measure = useCallback(() => {
    const target = targetRef.current;
    if (!target) {
      metricsRef.current = null;
      setMetrics(null);
      return;
    }

    const bounds = target.getBoundingClientRect();
    const targetTop = bounds.top + window.scrollY;
    const nextMetrics = calculateRailMetrics(targetTop, bounds.height, window.innerHeight);

    if (!nextMetrics) {
      metricsRef.current = null;
      setMetrics(null);
      return;
    }

    metricsRef.current = nextMetrics;
    setMetrics(nextMetrics);
    updateActiveMarker();
  }, [targetRef, updateActiveMarker]);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) {
      return;
    }

    function scheduleActiveMarkerUpdate() {
      if (updateFrameRef.current !== null) {
        return;
      }
      updateFrameRef.current = requestAnimationFrame(() => {
        updateFrameRef.current = null;
        updateActiveMarker();
      });
    }

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(target);
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", scheduleActiveMarkerUpdate, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", scheduleActiveMarkerUpdate);
      if (updateFrameRef.current !== null) {
        cancelAnimationFrame(updateFrameRef.current);
      }
    };
  }, [measure, targetRef, updateActiveMarker]);

  if (!metrics) {
    return null;
  }

  return (
    <nav
      aria-label="Chapter reading positions"
      className={cn(
        "fixed top-1/2 z-30 hidden -translate-y-1/2 opacity-45 transition-opacity hover:opacity-100 focus-within:opacity-100 motion-reduce:transition-none lg:block",
        inspectorOpen
          ? "right-4 min-[72rem]:right-[calc(var(--workspace-inspector-width)+1rem)]"
          : "right-4 xl:right-7",
      )}
    >
      <ol className="relative flex flex-col items-center py-1 before:absolute before:top-4 before:bottom-4 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border before:content-['']">
        {Array.from({ length: metrics.markerCount }, (_, markerIndex) => {
          const progress = metrics.markerCount === 1 ? 0 : markerIndex / (metrics.markerCount - 1);
          const pageNumber = Math.round(progress * (metrics.totalPages - 1)) + 1;
          const isActive = markerIndex === activeMarker;

          return (
            <li key={`${markerIndex}-${pageNumber}`}>
              <button
                aria-current={isActive ? "location" : undefined}
                aria-label={`Go to reading page ${pageNumber} of ${metrics.totalPages}`}
                className="group relative grid size-7 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                onClick={() => scrollToMarker(metrics, progress)}
                title={`Page ${pageNumber} of ${metrics.totalPages}`}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative z-10 w-1.5 rounded-full border border-background bg-muted-foreground transition-[height,background-color] motion-reduce:transition-none",
                    isActive ? "h-4 bg-primary" : "h-1.5 group-hover:bg-foreground",
                  )}
                />
                <span className="pointer-events-none absolute top-1/2 right-7 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[0.65rem] font-medium text-popover-foreground shadow-md group-hover:block group-focus-visible:block">
                  {pageNumber} / {metrics.totalPages}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function scrollToMarker(metrics: RailMetrics, progress: number) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({
    behavior: reducedMotion ? "auto" : "smooth",
    top: metrics.start + (metrics.end - metrics.start) * progress,
  });
}

export function calculateRailMetrics(
  targetTop: number,
  targetHeight: number,
  viewportHeight: number,
): RailMetrics | null {
  const readableHeight = Math.max(480, viewportHeight * 0.72);
  const totalPages = Math.max(1, Math.ceil(targetHeight / readableHeight));
  if (totalPages < 2) {
    return null;
  }

  const start = Math.max(0, targetTop - topInset);
  return {
    start,
    end: Math.max(start, targetTop + targetHeight - viewportHeight + topInset),
    markerCount: Math.min(totalPages, maximumMarkers),
    totalPages,
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
