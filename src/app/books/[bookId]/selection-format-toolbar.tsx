"use client";

import { Bold, Italic, Strikethrough, TextQuote } from "lucide-react";
import type { FocusEvent, PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import type { MarkdownSelectionFormat } from "@/lib/markdown";
import { cn } from "@/lib/utils";

export type SelectionFormatPosition = {
  left: number;
  top: number;
  placement: "above" | "below";
};

type SelectionFormatToolbarProps = {
  onDismiss: () => void;
  onFormat: (format: MarkdownSelectionFormat) => void;
  position: SelectionFormatPosition;
};

const formatActions = [
  {
    format: "bold",
    label: "Bold",
    shortcut: "Control+B Meta+B",
    title: "Bold (Cmd/Ctrl+B)",
    icon: Bold,
  },
  {
    format: "italic",
    label: "Italic",
    shortcut: "Control+I Meta+I",
    title: "Italic (Cmd/Ctrl+I)",
    icon: Italic,
  },
  {
    format: "strikethrough",
    label: "Strikethrough",
    title: "Strikethrough",
    icon: Strikethrough,
  },
  {
    format: "quote",
    label: "Quote selected lines",
    title: "Quote selected lines",
    icon: TextQuote,
    divider: true,
  },
] as const;

export function SelectionFormatToolbar({
  onDismiss,
  onFormat,
  position,
}: SelectionFormatToolbarProps) {
  function keepEditorSelection(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      onDismiss();
    }
  }

  return (
    <div
      aria-label="Format selected Markdown"
      className={cn(
        "fixed z-40 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-border/80 bg-popover/95 p-1 text-popover-foreground shadow-xl shadow-foreground/10 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 motion-reduce:animate-none",
        position.placement === "above" ? "-translate-y-[calc(100%+0.625rem)]" : "translate-y-2.5",
      )}
      data-selection-toolbar
      onBlur={handleBlur}
      onPointerDown={keepEditorSelection}
      role="toolbar"
      style={{ left: position.left, top: position.top }}
    >
      {formatActions.map((action) => {
        const Icon = action.icon;
        return (
          <div
            className={cn("flex items-center", "divider" in action && "ml-1 border-l pl-1")}
            key={action.format}
          >
            <Button
              aria-keyshortcuts={"shortcut" in action ? action.shortcut : undefined}
              aria-label={action.label}
              onClick={() => onFormat(action.format)}
              size="icon-sm"
              title={action.title}
              type="button"
              variant="ghost"
            >
              <Icon aria-hidden="true" />
            </Button>
          </div>
        );
      })}
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-1/2 size-2.5 -translate-x-1/2 rotate-45 bg-popover",
          position.placement === "above"
            ? "-bottom-1.5 border-r border-b border-border/80"
            : "-top-1.5 border-t border-l border-border/80",
        )}
      />
    </div>
  );
}
