"use client";

import { MotionIcon } from "motion-icons-react";
import Link from "next/link";
import {
  Fragment,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import "motion-icons-react/style.css";
import { cn } from "@/lib/utils";

export type FloatingToolbarItem = {
  id: string;
  label: string;
  displayLabel?: string;
  icon: string;
  href?: string;
  onSelect?: () => void;
  pressed?: boolean;
  shortcut?: string;
  dividerBefore?: boolean;
  disabled?: boolean;
  tooltip?: string;
};

type RevealToolsDetail = {
  focus?: boolean;
  itemId?: string;
};

type FloatingToolbarProps = {
  items: readonly FloatingToolbarItem[];
  label: string;
  accessory?: ReactNode;
  announcement?: string;
  autoHide?: boolean;
  className?: string;
  collapsedIcon?: string;
  collapsedLabel?: string;
  heldOpen?: boolean;
  initialVisibleMs?: number;
  onVisibleChange?: (visible: boolean) => void;
  visible?: boolean;
};

const desktopRevealDistance = 96;
const revealIntentDelay = 140;
const hideDelay = 900;
const upwardScrollRevealDistance = 12;

export function FloatingToolbar({
  accessory,
  announcement,
  autoHide = false,
  className,
  collapsedIcon = "PanelBottomOpen",
  collapsedLabel = "Tools",
  heldOpen = false,
  initialVisibleMs = 4000,
  items,
  label,
  onVisibleChange,
  visible,
}: FloatingToolbarProps) {
  const toolbarId = useId();
  const [activeIndex, setActiveIndex] = useState(() => firstEnabledIndex(items));
  const activeIndexRef = useRef(activeIndex);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [uncontrolledVisible, setUncontrolledVisible] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const contentRef = useRef<HTMLFieldSetElement>(null);
  const focusOnRevealRef = useRef(false);
  const handleRef = useRef<HTMLButtonElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsRef = useRef(items);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPointerInsideRef = useRef(false);
  const scrollPositionsRef = useRef(
    new WeakMap<EventTarget, { position: number; upwardDistance: number }>(),
  );
  const heldOpenRef = useRef(heldOpen);
  const isVisible = heldOpen || visible || (visible === undefined && uncontrolledVisible);
  heldOpenRef.current = heldOpen;
  itemsRef.current = items;

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const clearRevealTimeout = useCallback(() => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
  }, []);

  const setToolbarVisible = useCallback(
    (nextVisible: boolean) => {
      if (visible === undefined) {
        setUncontrolledVisible(nextVisible);
      }
      onVisibleChange?.(nextVisible);
    },
    [onVisibleChange, visible],
  );

  const showToolbar = useCallback(() => {
    clearHideTimeout();
    clearRevealTimeout();
    setToolbarVisible(true);
  }, [clearHideTimeout, clearRevealTimeout, setToolbarVisible]);

  const scheduleReveal = useCallback(() => {
    clearHideTimeout();
    if (revealTimeoutRef.current) {
      return;
    }
    revealTimeoutRef.current = setTimeout(() => {
      revealTimeoutRef.current = null;
      setToolbarVisible(true);
    }, revealIntentDelay);
  }, [clearHideTimeout, setToolbarVisible]);

  const scheduleHide = useCallback(() => {
    if (!autoHide || heldOpenRef.current || hideTimeoutRef.current) {
      return;
    }

    hideTimeoutRef.current = setTimeout(
      () => {
        hideTimeoutRef.current = null;

        if (
          isPointerInsideRef.current ||
          heldOpenRef.current ||
          (document.activeElement && contentRef.current?.contains(document.activeElement))
        ) {
          return;
        }

        setToolbarVisible(false);
      },
      isCoarsePointer ? initialVisibleMs : hideDelay,
    );
  }, [autoHide, initialVisibleMs, isCoarsePointer, setToolbarVisible]);

  const revealTemporarily = useCallback(() => {
    showToolbar();
    scheduleHide();
  }, [scheduleHide, showToolbar]);

  const revealAndFocus = useCallback(
    (itemId?: string) => {
      if (itemId) {
        const requestedIndex = itemsRef.current.findIndex(
          (item) => item.id === itemId && !item.disabled,
        );
        if (requestedIndex >= 0) {
          activeIndexRef.current = requestedIndex;
          setActiveIndex(requestedIndex);
        }
      }
      focusOnRevealRef.current = true;
      showToolbar();
      requestAnimationFrame(() => {
        const controls = enabledControls(contentRef.current);
        if (controls.length === 0) {
          return;
        }
        focusOnRevealRef.current = false;
        const nextIndex = Math.max(0, Math.min(activeIndexRef.current, controls.length - 1));
        controls[nextIndex]?.focus();
      });
    },
    [showToolbar],
  );

  useEffect(() => {
    const media = window.matchMedia("(hover: none), (pointer: coarse)");
    const updatePointer = () => setIsCoarsePointer(media.matches);
    updatePointer();
    media.addEventListener("change", updatePointer);
    return () => media.removeEventListener("change", updatePointer);
  }, []);

  useEffect(() => {
    if (heldOpen) {
      showToolbar();
    } else {
      clearHideTimeout();
      scheduleHide();
    }
  }, [clearHideTimeout, heldOpen, scheduleHide, showToolbar]);

  useEffect(() => {
    if (!autoHide || !isCoarsePointer) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Element | null;
      const isEditorTarget = Boolean(target?.closest("input, textarea, [contenteditable='true']"));
      if (isEditorTarget && !contentRef.current?.contains(target) && !heldOpenRef.current) {
        clearHideTimeout();
        setToolbarVisible(false);
        return;
      }

      const isToolbarTarget = Boolean(
        contentRef.current?.contains(target) || handleRef.current?.contains(target),
      );
      const touchesTopBar = Boolean(target?.closest("[data-app-top-bar]"));

      if (touchesTopBar) {
        revealTemporarily();
      } else if (isVisible && !isToolbarTarget && !heldOpenRef.current) {
        clearHideTimeout();
        scheduleHide();
      }
    }

    function handleScroll(event: Event) {
      const target = event.target;
      if (!target) {
        return;
      }

      const currentPosition = scrollPosition(target);
      if (currentPosition === null) {
        return;
      }

      const previous = scrollPositionsRef.current.get(target) ?? {
        position: currentPosition,
        upwardDistance: 0,
      };
      const upwardDistance =
        previous.position > currentPosition
          ? previous.upwardDistance + previous.position - currentPosition
          : 0;
      const shouldReveal = upwardDistance >= upwardScrollRevealDistance;
      scrollPositionsRef.current.set(target, {
        position: currentPosition,
        upwardDistance: shouldReveal ? 0 : upwardDistance,
      });
      if (shouldReveal) {
        revealTemporarily();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, { passive: true });
    if (visible === undefined) {
      document.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    }
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      if (visible === undefined) {
        document.removeEventListener("scroll", handleScroll, true);
      }
    };
  }, [
    autoHide,
    clearHideTimeout,
    isCoarsePointer,
    isVisible,
    revealTemporarily,
    scheduleHide,
    setToolbarVisible,
    visible,
  ]);

  useEffect(() => {
    if (items[activeIndex]?.disabled) {
      const nextIndex = firstEnabledIndex(items);
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    }
  }, [activeIndex, items]);

  useEffect(() => {
    if (!isVisible || !focusOnRevealRef.current) {
      return;
    }

    focusOnRevealRef.current = false;
    requestAnimationFrame(() => {
      const controls = enabledControls(contentRef.current);
      const nextIndex = Math.max(0, Math.min(activeIndex, controls.length - 1));
      controls[nextIndex]?.focus();
    });
  }, [activeIndex, isVisible]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!autoHide || isCoarsePointer || event.pointerType === "touch") {
        return;
      }

      const handleBounds = handleRef.current?.getBoundingClientRect();
      const isOverHandle =
        handleBounds &&
        event.clientX >= handleBounds.left &&
        event.clientX <= handleBounds.right &&
        event.clientY >= handleBounds.top &&
        event.clientY <= handleBounds.bottom;
      if (isOverHandle || (event.target as Element | null)?.closest("[data-toolbar-handle]")) {
        clearRevealTimeout();
        return;
      }

      if (window.innerHeight - event.clientY <= desktopRevealDistance) {
        scheduleReveal();
      } else {
        clearRevealTimeout();
        scheduleHide();
      }
    }

    function handleRevealTools(event: CustomEvent<RevealToolsDetail>) {
      if (event.detail?.focus === false) {
        revealTemporarily();
        return;
      }

      revealAndFocus(event.detail?.itemId);
    }

    if (autoHide) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
    }
    window.addEventListener("awthor:reveal-tools", handleRevealTools);

    return () => {
      clearHideTimeout();
      clearRevealTimeout();
      if (autoHide) {
        window.removeEventListener("pointermove", handlePointerMove);
      }
      window.removeEventListener("awthor:reveal-tools", handleRevealTools);
    };
  }, [
    autoHide,
    clearHideTimeout,
    clearRevealTimeout,
    isCoarsePointer,
    revealAndFocus,
    revealTemporarily,
    scheduleHide,
    scheduleReveal,
  ]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Alt") {
        setShowShortcuts(true);
        showToolbar();
        return;
      }

      if (!event.altKey || event.repeat) {
        return;
      }

      const itemIndex = itemsRef.current.findIndex(
        (item) => !item.disabled && shortcutMatchesEvent(item.shortcut, event),
      );
      if (itemIndex < 0) {
        return;
      }

      event.preventDefault();
      activeIndexRef.current = itemIndex;
      setActiveIndex(itemIndex);
      showToolbar();
      requestAnimationFrame(() => {
        contentRef.current
          ?.querySelector<HTMLElement>(`[data-toolbar-index="${itemIndex}"]`)
          ?.click();
      });
    }

    function hideShortcutHints() {
      setShowShortcuts(false);
      scheduleHide();
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === "Alt") {
        hideShortcutHints();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", hideShortcutHints);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", hideShortcutHints);
    };
  }, [scheduleHide, showToolbar]);

  function handleToolbarKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    const controls = enabledControls(event.currentTarget);
    if (controls.length === 0) {
      return;
    }

    event.preventDefault();
    const current = Math.max(0, controls.indexOf(document.activeElement as HTMLElement));
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? controls.length - 1
          : event.key === "ArrowRight"
            ? (current + 1) % controls.length
            : (current - 1 + controls.length) % controls.length;
    const nextItemIndex = Number(controls[next]?.dataset.toolbarIndex ?? next);
    activeIndexRef.current = nextItemIndex;
    setActiveIndex(nextItemIndex);
    controls[next]?.focus();
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center px-3",
        isVisible
          ? "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          : "pb-[max(0.25rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {accessory && isVisible ? (
        <div className="pointer-events-none mb-2 animate-in fade-in slide-in-from-bottom-1 duration-150 motion-reduce:animate-none">
          {accessory}
        </div>
      ) : null}
      <div className="grid w-full min-w-0 max-w-full place-items-center">
        <fieldset
          aria-label={`${label} controls`}
          aria-hidden={!isVisible}
          className={cn(
            "col-start-1 row-start-1 flex max-w-full min-w-0 flex-col items-center border-0 p-0 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
            isVisible
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3 opacity-0",
          )}
          inert={!isVisible}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              scheduleHide();
            }
          }}
          onFocus={showToolbar}
          onPointerEnter={() => {
            isPointerInsideRef.current = true;
            showToolbar();
          }}
          onPointerLeave={() => {
            isPointerInsideRef.current = false;
            scheduleHide();
          }}
          ref={contentRef}
        >
          <div
            aria-label={label}
            className="pointer-events-auto max-w-full overflow-x-auto rounded-2xl border border-border/80 bg-popover/95 p-1 text-popover-foreground shadow-xl shadow-foreground/10 backdrop-blur-xl"
            id={toolbarId}
            onKeyDown={handleToolbarKeyDown}
            role="toolbar"
          >
            <div className="flex min-w-max items-stretch gap-1">
              {items.map((item, index) => (
                <Fragment key={item.id}>
                  {item.dividerBefore ? (
                    <span aria-hidden="true" className="mx-1 my-1 w-px shrink-0 bg-border" />
                  ) : null}
                  <ToolbarItem
                    activeIndex={activeIndex}
                    index={index}
                    item={item}
                    onFocus={() => {
                      activeIndexRef.current = index;
                      setActiveIndex(index);
                    }}
                    showShortcut={showShortcuts}
                  />
                </Fragment>
              ))}
            </div>
          </div>
        </fieldset>
        <button
          aria-controls={toolbarId}
          aria-expanded={isVisible}
          aria-hidden={isVisible || undefined}
          aria-keyshortcuts="Alt+T"
          className={cn(
            "group col-start-1 row-start-1 inline-flex h-8 self-end items-center justify-center gap-1.5 rounded-full border border-border/80 bg-popover/95 px-3 text-xs font-semibold text-popover-foreground shadow-lg shadow-foreground/10 backdrop-blur-xl transition-[opacity,transform] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
            isVisible
              ? "pointer-events-none translate-y-2 opacity-0"
              : "pointer-events-auto translate-y-0 opacity-100",
            isCoarsePointer &&
              "h-11 w-16 border-transparent bg-transparent px-0 shadow-none backdrop-blur-none",
          )}
          data-toolbar-handle
          inert={isVisible}
          onClick={() => revealAndFocus()}
          ref={handleRef}
          tabIndex={isVisible ? -1 : 0}
          title={`${collapsedLabel} (Alt/Option+T)`}
          type="button"
        >
          {isCoarsePointer ? (
            <span
              aria-hidden="true"
              className="flex h-6 w-12 items-center justify-center rounded-full border border-border/50 bg-popover/60 opacity-70 shadow-sm shadow-foreground/5 backdrop-blur-md transition-[opacity,transform,background-color] duration-200 group-hover:bg-popover/80 group-hover:opacity-100 group-active:scale-95 motion-reduce:transition-none"
            >
              <span className="h-0.5 w-5 rounded-full bg-muted-foreground/45" />
            </span>
          ) : (
            <span aria-hidden="true" className="grid place-items-center">
              <MotionIcon animation="nudge" name={collapsedIcon} size={16} trigger="hover" />
            </span>
          )}
          <span className={cn(isCoarsePointer && "sr-only")}>{collapsedLabel}</span>
          {!isCoarsePointer ? (
            <kbd className="hidden rounded-sm border border-border bg-muted px-1 py-0.5 font-sans text-[0.6rem] leading-none text-muted-foreground sm:inline">
              ⌥T
            </kbd>
          ) : null}
        </button>
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

function ToolbarItem({
  activeIndex,
  index,
  item,
  onFocus,
  showShortcut,
}: {
  activeIndex: number;
  index: number;
  item: FloatingToolbarItem;
  onFocus: () => void;
  showShortcut: boolean;
}) {
  const className = cn(
    "relative inline-flex h-12 min-w-18 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[0.68rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 motion-reduce:transition-none sm:min-w-20 sm:px-3 sm:text-xs",
    item.pressed
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
  const title = item.tooltip
    ? `${item.tooltip}${item.shortcut ? ` · ${shortcutTitle(item.shortcut)}` : ""}`
    : item.shortcut
      ? `${item.label} (${shortcutTitle(item.shortcut)})`
      : item.label;
  const content = (
    <>
      {showShortcut && item.shortcut ? (
        <kbd className="absolute top-0.5 right-1 grid min-w-4 animate-in place-items-center rounded-sm border border-border bg-foreground px-1 font-mono text-[0.6rem] leading-4 font-bold text-background shadow-sm fade-in zoom-in-95 motion-reduce:animate-none">
          {shortcutBadge(item.shortcut)}
        </kbd>
      ) : null}
      <span aria-hidden="true" className="grid size-4 place-items-center">
        <MotionIcon
          animation="nudge"
          animationDelay={index * 25}
          entrance="scaleIn"
          name={item.icon}
          size={17}
          trigger="hover"
        />
      </span>
      <span aria-hidden="true" className="whitespace-nowrap">
        {item.displayLabel ?? item.label}
      </span>
    </>
  );
  const commonProps = {
    "aria-keyshortcuts": item.shortcut,
    "aria-label": item.label,
    className,
    "data-toolbar-item": true,
    "data-toolbar-index": index,
    onFocus,
    tabIndex: activeIndex === index ? 0 : -1,
    title,
  } as const;

  if (item.href) {
    return (
      <Link {...commonProps} aria-disabled={item.disabled || undefined} href={item.href}>
        {content}
      </Link>
    );
  }

  return (
    <button
      {...commonProps}
      aria-pressed={item.pressed}
      disabled={item.disabled}
      onClick={item.onSelect}
      type="button"
    >
      {content}
    </button>
  );
}

function firstEnabledIndex(items: readonly FloatingToolbarItem[]) {
  const index = items.findIndex((item) => !item.disabled);
  return index < 0 ? 0 : index;
}

function scrollPosition(target: EventTarget): number | null {
  if (target === document || target === document.documentElement || target === document.body) {
    return window.scrollY;
  }

  return target instanceof HTMLElement ? target.scrollTop : null;
}

function enabledControls(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      "[data-toolbar-item]:not([disabled]):not([aria-disabled='true'])",
    ),
  );
}

function shortcutBadge(shortcut: string) {
  return shortcut.split("+").at(-1) ?? shortcut;
}

function shortcutTitle(shortcut: string) {
  return shortcut.replace(/^Alt\+/u, "Option/Alt+");
}

function shortcutMatchesEvent(shortcut: string | undefined, event: KeyboardEvent) {
  if (!shortcut?.startsWith("Alt+")) {
    return false;
  }

  return event.code === `Digit${shortcutBadge(shortcut)}`;
}

declare global {
  interface WindowEventMap {
    "awthor:reveal-tools": CustomEvent<RevealToolsDetail>;
  }
}
