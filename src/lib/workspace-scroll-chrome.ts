export type WorkspaceChromePhase =
  | "chapter-open"
  | "edge"
  | "scrolling-up"
  | "scrolling-down"
  | "idle"
  | "interacting"
  | "revealed";

export type WorkspaceChromeSnapshot = Readonly<{
  phase: WorkspaceChromePhase;
  visible: boolean;
}>;

export type WorkspaceChromeScrollMetrics = {
  scrollTop: number;
  scrollHeight: number;
  viewportHeight: number;
};

export type WorkspaceChromeScheduler = {
  clearTimeout: (timer: ReturnType<typeof setTimeout>) => void;
  setTimeout: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
};

type WorkspaceChromeEdge = "start" | "end" | null;
type WorkspaceChromeDirection = "up" | "down" | null;

export const workspaceChromeEdgeVisibleMs = 2_000;
export const workspaceChromeIdleHideMs = 1_000;
export const workspaceChromeDirectionNoisePx = 3;
export const workspaceChromeEdgeThresholdPx = 8;

const defaultScheduler: WorkspaceChromeScheduler = {
  clearTimeout: (timer) => clearTimeout(timer),
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
};

export class WorkspaceChromeController {
  private activeInteractions = new Set<string>();
  private currentEdge: WorkspaceChromeEdge = null;
  private direction: WorkspaceChromeDirection = null;
  private directionTravel = 0;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private lastScrollTop: number | null = null;
  private listeners = new Set<() => void>();
  private scheduler: WorkspaceChromeScheduler;
  private snapshot: WorkspaceChromeSnapshot = {
    phase: "chapter-open",
    visible: true,
  };
  private suspended = false;

  constructor(scheduler: WorkspaceChromeScheduler = defaultScheduler) {
    this.scheduler = scheduler;
  }

  getSnapshot = (): WorkspaceChromeSnapshot => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  openChapter = (metrics: WorkspaceChromeScrollMetrics) => {
    this.suspended = false;
    this.clearHideTimer();
    this.currentEdge = getWorkspaceChromeEdge(metrics);
    this.direction = null;
    this.directionTravel = 0;
    this.lastScrollTop = metrics.scrollTop;

    if (this.activeInteractions.size > 0) {
      this.publish({ phase: "interacting", visible: true });
      return;
    }

    this.publish({ phase: "chapter-open", visible: true });
    this.scheduleHide(workspaceChromeEdgeVisibleMs);
  };

  updateScroll = (metrics: WorkspaceChromeScrollMetrics) => {
    if (this.suspended) {
      return;
    }

    const nextEdge = getWorkspaceChromeEdge(metrics);
    const previousScrollTop = this.lastScrollTop;
    this.lastScrollTop = metrics.scrollTop;

    if (nextEdge !== null) {
      this.direction = null;
      this.directionTravel = 0;

      if (nextEdge !== this.currentEdge) {
        this.currentEdge = nextEdge;
        this.showFor("edge", workspaceChromeEdgeVisibleMs);
      }
      return;
    }

    this.currentEdge = null;
    if (previousScrollTop === null) {
      return;
    }

    const distance = metrics.scrollTop - previousScrollTop;
    if (distance === 0) {
      return;
    }

    this.directionTravel += distance;
    if (Math.abs(this.directionTravel) < workspaceChromeDirectionNoisePx) {
      return;
    }

    const nextDirection: Exclude<WorkspaceChromeDirection, null> =
      this.directionTravel > 0 ? "down" : "up";
    this.directionTravel = 0;

    if (this.activeInteractions.size > 0) {
      this.direction = nextDirection;
      this.clearHideTimer();
      this.publish({ phase: "interacting", visible: true });
      return;
    }

    if (nextDirection === "up") {
      this.direction = "up";
      this.publish({ phase: "scrolling-up", visible: true });
      this.scheduleHide(workspaceChromeIdleHideMs);
      return;
    }

    const directionChanged = this.direction !== "down";
    this.direction = "down";
    this.publish({ phase: "scrolling-down", visible: this.snapshot.visible });
    if (directionChanged) {
      this.scheduleHide(workspaceChromeIdleHideMs);
    }
  };

  reveal = () => {
    if (this.suspended) {
      return;
    }

    this.direction = null;
    this.directionTravel = 0;
    if (this.activeInteractions.size > 0) {
      this.clearHideTimer();
      this.publish({ phase: "interacting", visible: true });
      return;
    }

    this.showFor("revealed", workspaceChromeEdgeVisibleMs);
  };

  setInteraction = (source: string, active: boolean) => {
    if (active) {
      this.activeInteractions.add(source);
      if (!this.suspended) {
        this.clearHideTimer();
        this.publish({ phase: "interacting", visible: true });
      }
      return;
    }

    const interactionEnded = this.activeInteractions.delete(source);
    if (!interactionEnded || this.suspended || this.activeInteractions.size > 0) {
      return;
    }

    this.publish({ phase: "idle", visible: true });
    this.scheduleHide(workspaceChromeIdleHideMs);
  };

  suspend = () => {
    this.suspended = true;
    this.clearHideTimer();
    this.activeInteractions.clear();
    this.currentEdge = null;
    this.direction = null;
    this.directionTravel = 0;
    this.lastScrollTop = null;
    this.publish({ phase: "idle", visible: true });
  };

  destroy = () => {
    this.suspend();
    this.listeners.clear();
  };

  private clearHideTimer() {
    if (this.hideTimer === null) {
      return;
    }

    this.scheduler.clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }

  private publish(snapshot: WorkspaceChromeSnapshot) {
    if (snapshot.phase === this.snapshot.phase && snapshot.visible === this.snapshot.visible) {
      return;
    }

    this.snapshot = snapshot;
    for (const listener of this.listeners) {
      listener();
    }
  }

  private scheduleHide(delayMs: number) {
    this.clearHideTimer();
    this.hideTimer = this.scheduler.setTimeout(() => {
      this.hideTimer = null;
      if (this.suspended || this.activeInteractions.size > 0) {
        return;
      }
      this.publish({ phase: "idle", visible: false });
    }, delayMs);
  }

  private showFor(phase: WorkspaceChromePhase, durationMs: number) {
    if (this.activeInteractions.size > 0) {
      this.clearHideTimer();
      this.publish({ phase: "interacting", visible: true });
      return;
    }

    this.publish({ phase, visible: true });
    this.scheduleHide(durationMs);
  }
}

export function getWorkspaceChromeEdge({
  scrollHeight,
  scrollTop,
  viewportHeight,
}: WorkspaceChromeScrollMetrics): WorkspaceChromeEdge {
  const maximumScroll = Math.max(scrollHeight - viewportHeight, 0);
  const normalizedScrollTop = Math.max(0, Math.min(scrollTop, maximumScroll));

  if (maximumScroll === 0 || normalizedScrollTop <= workspaceChromeEdgeThresholdPx) {
    return "start";
  }

  return maximumScroll - normalizedScrollTop <= workspaceChromeEdgeThresholdPx ? "end" : null;
}
