"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChapterArcDrawer } from "@/components/book-tools/chapter-arc-drawer";
import { CharactersDrawer } from "@/components/book-tools/characters-drawer";
import { FloatingToolbar, type FloatingToolbarItem } from "@/components/ui/floating-toolbar";
import { countManuscript } from "@/lib/markdown";
import type { Chapter, WorkspaceMode, WorkspaceTool } from "@/lib/repository";

const ProofreadingDrawer = dynamic(
  () =>
    import("@/components/book-tools/proofreading-drawer").then(
      (module) => module.ProofreadingDrawer,
    ),
  { ssr: false },
);

type BookFloatingToolbarProps = {
  bookId: string;
  chapters: readonly Chapter[];
  currentChapterId: string;
  draft: string;
  mode: WorkspaceMode;
  activeTool: WorkspaceTool;
  onActiveToolChange: (tool: WorkspaceTool) => void;
  onApplyDraft: (markdown: string) => void;
  onRequestWrite: () => void;
  onChapterUpdated: (chapter: Chapter) => void;
  onBeforeToolOpen: () => Promise<void>;
  onToolDirtyChange: (tool: Exclude<WorkspaceTool, null>, dirty: boolean) => void;
  onRestoreEditorFocus: () => void;
};

export function BookFloatingToolbar({
  activeTool,
  bookId,
  chapters,
  currentChapterId,
  draft,
  mode,
  onActiveToolChange,
  onApplyDraft,
  onBeforeToolOpen,
  onChapterUpdated,
  onRequestWrite,
  onRestoreEditorFocus,
  onToolDirtyChange,
}: BookFloatingToolbarProps) {
  const [announcement, setAnnouncement] = useState("Book tools ready.");
  const [openingTool, setOpeningTool] = useState<WorkspaceTool>(null);
  const [showCounts, setShowCounts] = useState(false);
  const previousToolRef = useRef<WorkspaceTool>(activeTool);
  const counts = useMemo(() => countManuscript(draft), [draft]);

  useEffect(() => {
    if (previousToolRef.current && !activeTool) {
      if (mode === "write") {
        onRestoreEditorFocus();
      } else {
        window.dispatchEvent(
          new CustomEvent("awthor:reveal-tools", {
            detail: { itemId: previousToolRef.current },
          }),
        );
      }
    }
    previousToolRef.current = activeTool;
  }, [activeTool, mode, onRestoreEditorFocus]);

  async function selectTool(tool: Exclude<WorkspaceTool, null>, label: string) {
    if (activeTool === tool) {
      onActiveToolChange(null);
      setAnnouncement(`${label} closed.`);
      return;
    }

    setOpeningTool(tool);
    setAnnouncement(`Opening ${label.toLowerCase()}…`);
    try {
      await onBeforeToolOpen();
      onActiveToolChange(tool);
      setAnnouncement(`${label} opened.`);
    } catch {
      setAnnouncement(`${label} could not open because the current chapter was not saved.`);
    } finally {
      setOpeningTool(null);
    }
  }

  function closeTool(tool: Exclude<WorkspaceTool, null>, open: boolean) {
    if (!open && activeTool === tool) {
      onActiveToolChange(null);
    }
  }

  const reportCharacterDirty = useCallback(
    (dirty: boolean) => onToolDirtyChange("characters", dirty),
    [onToolDirtyChange],
  );
  const reportChapterArcDirty = useCallback(
    (dirty: boolean) => onToolDirtyChange("chapter-arc", dirty),
    [onToolDirtyChange],
  );

  function toggleCounts() {
    setShowCounts((current) => {
      const next = !current;
      setAnnouncement(next ? "Chapter counts shown." : "Chapter counts hidden.");
      return next;
    });
  }

  const items: FloatingToolbarItem[] = [
    {
      id: "spelling",
      label: "Open spell check",
      displayLabel: "Spell check",
      icon: "SpellCheck2",
      onSelect: () => void selectTool("spelling", "Spell check"),
      pressed: activeTool === "spelling",
      disabled: openingTool !== null,
      tooltip: "Spell check · runs locally",
    },
    {
      id: "characters",
      label: "Open characters",
      displayLabel: "Characters",
      icon: "Users",
      onSelect: () => void selectTool("characters", "Characters"),
      pressed: activeTool === "characters",
      disabled: openingTool !== null,
      tooltip: "Characters · story bible",
    },
    {
      id: "chapter-arc",
      label: "Open chapter arc",
      displayLabel: "Chapter arc",
      icon: "ListTree",
      onSelect: () => void selectTool("chapter-arc", "Chapter arc"),
      pressed: activeTool === "chapter-arc",
      disabled: openingTool !== null,
      tooltip: "Chapter arc · tension and outcomes",
    },
    {
      id: "counts",
      label: showCounts ? "Hide chapter counts" : "Show chapter counts",
      displayLabel: "Counts",
      icon: "LetterText",
      onSelect: toggleCounts,
      pressed: showCounts,
      tooltip: showCounts ? "Hide word and character count" : "Show word and character count",
    },
  ];

  return (
    <>
      <FloatingToolbar
        accessory={
          showCounts ? (
            <div
              className="flex items-center gap-2 rounded-full border border-border/80 bg-popover/95 px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-lg shadow-foreground/10 backdrop-blur-xl"
              title="Character count includes whitespace"
            >
              <span className="tabular-nums">
                {counts.wordCount.toLocaleString()} {counts.wordCount === 1 ? "word" : "words"}
              </span>
              <span aria-hidden="true" className="size-1 rounded-full bg-muted-foreground/50" />
              <span className="tabular-nums">
                {counts.characterCountWithSpaces.toLocaleString()} characters
              </span>
            </div>
          ) : null
        }
        announcement={announcement}
        autoHide
        collapsedLabel="Tools"
        heldOpen={activeTool !== null || openingTool !== null}
        items={items}
        label="Book tools"
      />
      {activeTool === "spelling" ? (
        <ProofreadingDrawer
          draft={draft}
          mode={mode}
          onApplyDraft={onApplyDraft}
          onOpenChange={(open) => closeTool("spelling", open)}
          onRequestWrite={onRequestWrite}
          open
        />
      ) : null}
      <CharactersDrawer
        bookId={bookId}
        onDirtyChange={reportCharacterDirty}
        onOpenChange={(open) => closeTool("characters", open)}
        open={activeTool === "characters"}
      />
      <ChapterArcDrawer
        bookId={bookId}
        chapters={chapters}
        currentChapterId={currentChapterId}
        onChapterUpdated={onChapterUpdated}
        onDirtyChange={reportChapterArcDirty}
        onOpenChange={(open) => closeTool("chapter-arc", open)}
        open={activeTool === "chapter-arc"}
      />
    </>
  );
}
