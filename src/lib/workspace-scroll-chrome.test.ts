import { describe, expect, test } from "bun:test";
import {
  getWorkspaceChromeEdge,
  WorkspaceChromeController,
  type WorkspaceChromeScheduler,
} from "./workspace-scroll-chrome";

describe("workspace chrome controller", () => {
  test("shows a newly opened chapter for two seconds", () => {
    const clock = new FakeClock();
    const controller = new WorkspaceChromeController(clock);

    controller.openChapter(metrics(0));
    clock.advance(1_999);
    expect(controller.getSnapshot()).toEqual({ phase: "chapter-open", visible: true });

    clock.advance(1);
    expect(controller.getSnapshot()).toEqual({ phase: "idle", visible: false });
  });

  test("hides one second after downward reading begins without resetting the timer", () => {
    const clock = new FakeClock();
    const controller = new WorkspaceChromeController(clock);

    controller.openChapter(metrics(1_000));
    controller.updateScroll(metrics(1_100));
    clock.advance(600);
    controller.updateScroll(metrics(1_200));
    clock.advance(399);
    expect(controller.getSnapshot()).toEqual({ phase: "scrolling-down", visible: true });

    clock.advance(1);
    expect(controller.getSnapshot()).toEqual({ phase: "idle", visible: false });
  });

  test("reveals immediately while scrolling upward and hides after scrolling stops", () => {
    const clock = new FakeClock();
    const controller = new WorkspaceChromeController(clock);

    controller.openChapter(metrics(1_200));
    clock.advance(2_000);
    controller.updateScroll(metrics(1_100));
    expect(controller.getSnapshot()).toEqual({ phase: "scrolling-up", visible: true });

    clock.advance(900);
    controller.updateScroll(metrics(1_000));
    clock.advance(999);
    expect(controller.getSnapshot()).toEqual({ phase: "scrolling-up", visible: true });

    clock.advance(1);
    expect(controller.getSnapshot()).toEqual({ phase: "idle", visible: false });
  });

  test("shows the chrome for two seconds when reaching either chapter edge", () => {
    const clock = new FakeClock();
    const controller = new WorkspaceChromeController(clock);

    controller.openChapter(metrics(1_000));
    clock.advance(2_000);
    controller.updateScroll(metrics(3_000));
    expect(controller.getSnapshot()).toEqual({ phase: "edge", visible: true });

    clock.advance(1_999);
    expect(controller.getSnapshot().visible).toBe(true);
    clock.advance(1);
    expect(controller.getSnapshot()).toEqual({ phase: "idle", visible: false });

    controller.updateScroll(metrics(0));
    expect(controller.getSnapshot()).toEqual({ phase: "edge", visible: true });
  });

  test("pins the chrome during interaction and hides one second after release", () => {
    const clock = new FakeClock();
    const controller = new WorkspaceChromeController(clock);

    controller.openChapter(metrics(1_000));
    controller.setInteraction("toolbar-focus", true);
    clock.advance(10_000);
    expect(controller.getSnapshot()).toEqual({ phase: "interacting", visible: true });

    controller.setInteraction("toolbar-focus", false);
    clock.advance(999);
    expect(controller.getSnapshot()).toEqual({ phase: "idle", visible: true });
    clock.advance(1);
    expect(controller.getSnapshot()).toEqual({ phase: "idle", visible: false });
  });

  test("ignores small scroll jitter without using scroll speed", () => {
    const clock = new FakeClock();
    const controller = new WorkspaceChromeController(clock);

    controller.openChapter(metrics(1_000));
    controller.updateScroll(metrics(1_001));
    controller.updateScroll(metrics(1_000));
    clock.advance(999);
    expect(controller.getSnapshot()).toEqual({ phase: "chapter-open", visible: true });

    controller.updateScroll(metrics(997));
    expect(controller.getSnapshot()).toEqual({ phase: "scrolling-up", visible: true });
  });

  test("keeps only one visibility timer active", () => {
    const clock = new FakeClock();
    const controller = new WorkspaceChromeController(clock);

    controller.openChapter(metrics(1_000));
    controller.updateScroll(metrics(900));
    controller.updateScroll(metrics(800));
    controller.reveal();

    expect(clock.activeTimerCount).toBe(1);
  });

  test("ignores release events for interactions that were never active", () => {
    const clock = new FakeClock();
    const controller = new WorkspaceChromeController(clock);

    controller.openChapter(metrics(1_000));
    controller.setInteraction("toolbar-focus", false);
    clock.advance(1_000);

    expect(controller.getSnapshot()).toEqual({ phase: "chapter-open", visible: true });
  });
});

describe("workspace chrome edges", () => {
  test("recognizes the true start and end instead of the final viewport", () => {
    expect(getWorkspaceChromeEdge(metrics(0))).toBe("start");
    expect(getWorkspaceChromeEdge(metrics(2_000))).toBeNull();
    expect(getWorkspaceChromeEdge(metrics(3_000))).toBe("end");
  });

  test("treats a chapter that does not scroll as its start", () => {
    expect(getWorkspaceChromeEdge({ scrollHeight: 700, scrollTop: 0, viewportHeight: 800 })).toBe(
      "start",
    );
  });
});

function metrics(scrollTop: number) {
  return {
    scrollHeight: 3_800,
    scrollTop,
    viewportHeight: 800,
  };
}

class FakeClock implements WorkspaceChromeScheduler {
  private nextId = 1;
  private now = 0;
  private timers = new Map<number, { callback: () => void; runAt: number }>();

  get activeTimerCount() {
    return this.timers.size;
  }

  clearTimeout = (timer: ReturnType<typeof setTimeout>) => {
    this.timers.delete(timer as unknown as number);
  };

  setTimeout = (callback: () => void, delayMs: number) => {
    const id = this.nextId;
    this.nextId += 1;
    this.timers.set(id, { callback, runAt: this.now + delayMs });
    return id as unknown as ReturnType<typeof setTimeout>;
  };

  advance(durationMs: number) {
    const target = this.now + durationMs;

    while (true) {
      const nextTimer = [...this.timers.entries()]
        .filter(([, timer]) => timer.runAt <= target)
        .sort((left, right) => left[1].runAt - right[1].runAt)[0];
      if (!nextTimer) {
        break;
      }

      const [id, timer] = nextTimer;
      this.timers.delete(id);
      this.now = timer.runAt;
      timer.callback();
    }

    this.now = target;
  }
}
