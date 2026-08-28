"use client";

import { MotionIcon } from "motion-icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
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
};

const revealDistance = 112;
const hideDistance = 176;
const hideDelay = 650;

export function FloatingToolbar({
  accessory,
  announcement,
  autoHide = false,
  className,
  collapsedIcon = "PanelBottomOpen",
  collapsedLabel = "Show toolbar",
  items,
  label,
}: FloatingToolbarProps) {
  const router = useRouter();
  const toolbarId = useId();
  const [isVisible, setIsVisible] = useState(!autoHide);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const contentRef = useRef<HTMLFieldSetElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPointerInsideRef = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const showToolbar = useCallback(() => {
    clearHideTimeout();
    setIsVisible(true);
  }, [clearHideTimeout]);

  const hideToolbar = useCallback(() => {
    clearHideTimeout();
    setIsVisible(false);
  }, [clearHideTimeout]);

  const scheduleHide = useCallback(() => {
    if (!autoHide || hideTimeoutRef.current) {
      return;
    }

    hideTimeoutRef.current = setTimeout(() => {
      hideTimeoutRef.current = null;

      if (
        isPointerInsideRef.current ||
        (document.activeElement && contentRef.current?.contains(document.activeElement))
      ) {
        return;
      }

      setIsVisible(false);
    }, hideDelay);
  }, [autoHide]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!autoHide || event.pointerType === "touch") {
        return;
      }

      const distanceFromBottom = window.innerHeight - event.clientY;

      if (distanceFromBottom <= revealDistance) {
        showToolbar();
      } else if (distanceFromBottom >= hideDistance) {
        scheduleHide();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Alt") {
        setShowShortcuts(true);
        showToolbar();
        return;
      }

      if (event.key === "Escape" && autoHide) {
        hideToolbar();
        return;
      }

      if (!event.altKey || event.repeat) {
        return;
      }

      const selectedItem = itemsRef.current.find((item) => {
        if (!item.shortcut) {
          return false;
        }

        const shortcut = item.shortcut.toUpperCase();
        return event.code === `Digit${shortcut}` || event.code === `Key${shortcut}`;
      });

      if (!selectedItem) {
        return;
      }

      event.preventDefault();
      showToolbar();

      if (selectedItem.href) {
        router.push(selectedItem.href);
      } else {
        selectedItem.onSelect?.();
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === "Alt") {
        setShowShortcuts(false);
        scheduleHide();
      }
    }

    function handleWindowBlur() {
      setShowShortcuts(false);
      scheduleHide();
    }

    if (autoHide) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      clearHideTimeout();
      if (autoHide) {
        window.removeEventListener("pointermove", handlePointerMove);
      }
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [autoHide, clearHideTimeout, hideToolbar, router, scheduleHide, showToolbar]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {isVisible ? (
        <fieldset
          aria-label={`${label} controls`}
          className="flex max-w-full min-w-0 animate-in flex-col items-center border-0 p-0 fade-in slide-in-from-bottom-2 duration-200"
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
          {accessory ? <div className="pointer-events-auto mb-2">{accessory}</div> : null}
          <nav
            aria-label={label}
            className="pointer-events-auto max-w-full overflow-x-auto rounded-xl border border-border/80 bg-popover/95 p-0.5 text-popover-foreground shadow-xl shadow-foreground/10 backdrop-blur-xl"
            id={toolbarId}
          >
            <div className="flex min-w-max items-stretch gap-0.5">
              {items.map((item, index) => (
                <Fragment key={item.id}>
                  {item.dividerBefore ? (
                    <span aria-hidden="true" className="mx-1 my-1 w-px shrink-0 bg-border" />
                  ) : null}
                  <ToolbarItem index={index} item={item} showShortcut={showShortcuts} />
                </Fragment>
              ))}
            </div>
          </nav>
        </fieldset>
      ) : (
        <button
          aria-controls={toolbarId}
          aria-expanded="false"
          aria-label={collapsedLabel}
          className="pointer-events-auto grid size-9 animate-in place-items-center rounded-full border border-border/80 bg-popover/95 text-popover-foreground shadow-lg shadow-foreground/10 fade-in zoom-in-95 backdrop-blur-xl duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          onClick={showToolbar}
          onPointerEnter={showToolbar}
          title={collapsedLabel}
          type="button"
        >
          <span aria-hidden="true" className="grid place-items-center">
            <MotionIcon animation="nudge" name={collapsedIcon} size={16} trigger="hover" />
          </span>
        </button>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

function ToolbarItem({
  index,
  item,
  showShortcut,
}: {
  index: number;
  item: FloatingToolbarItem;
  showShortcut: boolean;
}) {
  const className = cn(
    "relative inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:h-9 sm:min-w-14 sm:flex-col sm:gap-0 sm:px-2",
    item.pressed
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
  const content = (
    <>
      {showShortcut && item.shortcut ? (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0.5 grid min-w-3.5 animate-in place-items-center rounded border border-border bg-foreground px-0.5 font-mono text-[9px] leading-3.5 font-bold text-background shadow-sm fade-in zoom-in-95"
        >
          {item.shortcut}
        </span>
      ) : null}
      <span aria-hidden="true" className="grid size-4 place-items-center">
        <MotionIcon
          animation="nudge"
          animationDelay={index * 25}
          entrance="scaleIn"
          name={item.icon}
          size={16}
          trigger="hover"
        />
      </span>
      <span aria-hidden="true" className="hidden whitespace-nowrap sm:inline">
        {item.displayLabel ?? item.label}
      </span>
    </>
  );

  if (item.href) {
    return (
      <Link
        aria-keyshortcuts={item.shortcut ? `Alt+${item.shortcut}` : undefined}
        aria-label={item.label}
        className={className}
        href={item.href}
        title={item.shortcut ? `${item.label} (Alt+${item.shortcut})` : item.label}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      aria-keyshortcuts={item.shortcut ? `Alt+${item.shortcut}` : undefined}
      aria-label={item.label}
      aria-pressed={item.pressed}
      className={className}
      onClick={item.onSelect}
      title={item.shortcut ? `${item.label} (Alt+${item.shortcut})` : item.label}
      type="button"
    >
      {content}
    </button>
  );
}
