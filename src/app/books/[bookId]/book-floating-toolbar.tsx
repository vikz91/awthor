"use client";

import { useState } from "react";
import { FloatingToolbar, type FloatingToolbarItem } from "@/components/ui/floating-toolbar";

type BookFloatingToolbarProps = {
  bookId: string;
  characterCount: string;
  characterCountWithSpaces: string;
  wordCount: string;
};

export function BookFloatingToolbar({
  bookId,
  characterCount,
  characterCountWithSpaces,
  wordCount,
}: BookFloatingToolbarProps) {
  const [mode, setMode] = useState<"read" | "write">("read");
  const [spellCheck, setSpellCheck] = useState(false);
  const [visualDrift, setVisualDrift] = useState(false);
  const [showCounts, setShowCounts] = useState(false);
  const [announcement, setAnnouncement] = useState("Read mode selected.");

  function toggleMode() {
    const nextMode = mode === "read" ? "write" : "read";
    setMode(nextMode);
    setAnnouncement(`${nextMode === "read" ? "Read" : "Write"} mode selected.`);
  }

  function toggleSpellCheck() {
    setSpellCheck((current) => {
      const nextValue = !current;
      setAnnouncement(`Spell and grammar check ${nextValue ? "enabled" : "disabled"}.`);
      return nextValue;
    });
  }

  function toggleVisualDrift() {
    setVisualDrift((current) => {
      const nextValue = !current;
      setAnnouncement(`Visual drift ${nextValue ? "enabled" : "disabled"}.`);
      return nextValue;
    });
  }

  function toggleCounts() {
    setShowCounts((current) => {
      const nextValue = !current;
      setAnnouncement(`Writing counts ${nextValue ? "shown" : "hidden"}.`);
      return nextValue;
    });
  }

  const items: FloatingToolbarItem[] = [
    {
      id: "mode",
      label: `Switch to ${mode === "read" ? "write" : "read"} mode`,
      displayLabel: mode === "read" ? "Read" : "Write",
      icon: mode === "read" ? "BookOpen" : "PenLine",
      onSelect: toggleMode,
      pressed: mode === "write",
      shortcut: "1",
    },
    {
      id: "spell-check",
      label: `${spellCheck ? "Disable" : "Enable"} spell and grammar check`,
      displayLabel: spellCheck ? "Spell on" : "Spell off",
      icon: "SpellCheck2",
      onSelect: toggleSpellCheck,
      pressed: spellCheck,
      shortcut: "2",
    },
    {
      id: "visual-drift",
      label: `${visualDrift ? "Disable" : "Enable"} visual drift`,
      displayLabel: visualDrift ? "Drift on" : "Drift off",
      icon: "ScanSearch",
      onSelect: toggleVisualDrift,
      pressed: visualDrift,
      shortcut: "3",
    },
    {
      id: "characters",
      label: "Open characters",
      displayLabel: "Characters",
      icon: "Users",
      href: `/books/${bookId}/characters`,
      dividerBefore: true,
      shortcut: "4",
    },
    {
      id: "chapter-arc",
      label: "Open chapter arc",
      displayLabel: "Chapter arc",
      icon: "ListTree",
      href: `/books/${bookId}/chapters`,
      shortcut: "5",
    },
    {
      id: "book-arc",
      label: "Open book arc",
      displayLabel: "Book arc",
      icon: "Waypoints",
      href: `/books/${bookId}/plots`,
      shortcut: "6",
    },
    {
      id: "counts",
      label: `${showCounts ? "Hide" : "Show"} word and character counts`,
      displayLabel: "Counts",
      icon: "Sigma",
      onSelect: toggleCounts,
      pressed: showCounts,
      dividerBefore: true,
      shortcut: "7",
    },
  ];

  return (
    <FloatingToolbar
      accessory={
        showCounts ? (
          <WritingCounts
            characterCount={characterCount}
            characterCountWithSpaces={characterCountWithSpaces}
            wordCount={wordCount}
          />
        ) : null
      }
      announcement={announcement}
      autoHide
      collapsedLabel="Show book tools"
      items={items}
      label="Book tools"
    />
  );
}

function WritingCounts({
  characterCount,
  characterCountWithSpaces,
  wordCount,
}: Omit<BookFloatingToolbarProps, "bookId">) {
  return (
    <section
      aria-label="Writing counts"
      className="rounded-2xl border border-border/80 bg-popover/95 px-4 py-3 text-popover-foreground shadow-lg shadow-foreground/10 backdrop-blur-xl"
    >
      <dl className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
        <Count label="Words" value={wordCount} />
        <Count label="Characters" value={characterCount} />
        <Count label="With spaces" value={characterCountWithSpaces} />
      </dl>
    </section>
  );
}

function Count({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="font-semibold text-muted-foreground">{label}</dt>
      <dd className="font-mono font-bold text-foreground tabular-nums">{value}</dd>
    </div>
  );
}
