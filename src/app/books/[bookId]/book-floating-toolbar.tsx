"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChapterArcDrawer } from "@/components/book-tools/chapter-arc-drawer";
import { CharactersDrawer } from "@/components/book-tools/characters-drawer";
import { FloatingToolbar, type FloatingToolbarItem } from "@/components/ui/floating-toolbar";
import { countManuscript } from "@/lib/markdown";
import type {
  BookProofreadingSettings,
  Chapter,
  DocumentLayout,
  WorkspaceMode,
  WorkspaceTool,
} from "@/lib/repository";

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
  documentLayout: DocumentLayout;
  draft: string;
  inspectorOpen: boolean;
  notebookMode: boolean;
  chromeVisible: boolean;
  mode: WorkspaceMode;
  activeTool: WorkspaceTool;
  onActiveToolChange: (tool: WorkspaceTool) => void;
  onApplyDraft: (markdown: string) => void;
  onRequestWrite: () => void;
  onChapterUpdated: (chapter: Chapter) => void;
  onDocumentLayoutChange: (layout: DocumentLayout) => Promise<void>;
  onNotebookModeChange: (enabled: boolean) => Promise<void>;
  onChromeInteractionChange: (source: string, active: boolean) => void;
  onChromeReveal: () => void;
  onBeforeToolOpen: () => Promise<void>;
  onProofreadingPreferencesChange: (preferences: BookProofreadingSettings) => Promise<void>;
  onToolDirtyChange: (tool: Exclude<WorkspaceTool, null>, dirty: boolean) => void;
  onRestoreEditorFocus: () => void;
  proofreadingPreferences: BookProofreadingSettings;
};

export function BookFloatingToolbar({
  activeTool,
  bookId,
  chapters,
  chromeVisible,
  currentChapterId,
  documentLayout,
  draft,
  inspectorOpen,
  notebookMode,
  mode,
  onActiveToolChange,
  onApplyDraft,
  onBeforeToolOpen,
  onChapterUpdated,
  onChromeInteractionChange,
  onChromeReveal,
  onDocumentLayoutChange,
  onNotebookModeChange,
  onProofreadingPreferencesChange,
  onRequestWrite,
  onRestoreEditorFocus,
  onToolDirtyChange,
  proofreadingPreferences,
}: BookFloatingToolbarProps) {
  const [announcement, setAnnouncement] = useState("Book tools ready.");
  const [openingTool, setOpeningTool] = useState<WorkspaceTool>(null);
  const [savingLayout, setSavingLayout] = useState(false);
  const [savingNotebookMode, setSavingNotebookMode] = useState(false);
  const [showCounts, setShowCounts] = useState(false);
  const previousToolRef = useRef<WorkspaceTool>(activeTool);
  const counts = useMemo(() => countManuscript(draft), [draft]);
  const handleChromeInteraction = useCallback(
    (source: "focus" | "pointer" | "shortcut", active: boolean) => {
      onChromeInteractionChange(`bottom-${source}`, active);
    },
    [onChromeInteractionChange],
  );

  useEffect(() => {
    onChromeInteractionChange("bottom-opening-tool", openingTool !== null);
    return () => onChromeInteractionChange("bottom-opening-tool", false);
  }, [onChromeInteractionChange, openingTool]);

  useEffect(() => {
    if (previousToolRef.current && !activeTool && !inspectorOpen) {
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
  }, [activeTool, inspectorOpen, mode, onRestoreEditorFocus]);

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

  async function toggleDocumentLayout() {
    const nextLayout: DocumentLayout = documentLayout === "pages" ? "seamless" : "pages";
    setSavingLayout(true);
    setAnnouncement(`Switching to ${nextLayout} layout…`);
    try {
      await onDocumentLayoutChange(nextLayout);
      setAnnouncement(
        nextLayout === "pages" && mode === "write"
          ? "Page layout selected. Switch to Read to preview pages."
          : `${nextLayout === "pages" ? "Page" : "Seamless"} layout selected.`,
      );
    } catch {
      setAnnouncement("The document layout preference could not be saved on this device.");
    } finally {
      setSavingLayout(false);
    }
  }

  async function toggleNotebookMode() {
    const enabled = !notebookMode;
    setSavingNotebookMode(true);
    setAnnouncement(`${enabled ? "Turning on" : "Turning off"} notebook mode…`);
    try {
      await onNotebookModeChange(enabled);
      setAnnouncement(`Notebook mode ${enabled ? "on" : "off"}.`);
    } catch {
      setAnnouncement("The notebook preference could not be saved on this device.");
    } finally {
      setSavingNotebookMode(false);
    }
  }

  const items: FloatingToolbarItem[] = [
    {
      id: "spelling",
      label: "Open spell check",
      displayLabel: "Spell check",
      icon: "SpellCheck2",
      onSelect: () => void selectTool("spelling", "Spell check"),
      pressed: activeTool === "spelling",
      shortcut: "Alt+1",
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
      shortcut: "Alt+2",
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
      shortcut: "Alt+3",
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
      shortcut: "Alt+4",
      tooltip: showCounts ? "Hide word and character count" : "Show word and character count",
    },
    {
      id: "layout",
      label: documentLayout === "pages" ? "Use seamless layout" : "Use page layout",
      displayLabel: documentLayout === "pages" ? "Pages" : "Seamless",
      icon: documentLayout === "pages" ? "Files" : "Rows3",
      onSelect: () => void toggleDocumentLayout(),
      pressed: documentLayout === "pages",
      shortcut: "Alt+5",
      dividerBefore: true,
      disabled: savingLayout,
      tooltip:
        documentLayout === "pages"
          ? "Switch to uninterrupted scrolling"
          : "Preview print-like pages in Read",
    },
  ];

  if (mode === "write") {
    items.push({
      id: "notebook",
      label: notebookMode ? "Turn notebook mode off" : "Turn notebook mode on",
      displayLabel: "Notebook",
      icon: "NotebookPen",
      onSelect: () => void toggleNotebookMode(),
      pressed: notebookMode,
      shortcut: "Alt+6",
      disabled: savingNotebookMode,
      tooltip: notebookMode
        ? "Return to the classic writing surface"
        : "Write with a handwriting font and ruled lines",
    });
  }

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
        className={
          inspectorOpen ? "min-[72rem]:right-[var(--workspace-inspector-width)]" : undefined
        }
        collapsedLabel="Tools"
        items={items}
        label="Book tools"
        onInteractionChange={handleChromeInteraction}
        onReveal={onChromeReveal}
        visible={chromeVisible}
      />
      {activeTool === "spelling" ? (
        <ProofreadingDrawer
          draft={draft}
          mode={mode}
          onApplyDraft={onApplyDraft}
          onOpenChange={(open) => closeTool("spelling", open)}
          onPreferencesChange={onProofreadingPreferencesChange}
          onRequestWrite={onRequestWrite}
          open
          preferences={proofreadingPreferences}
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
