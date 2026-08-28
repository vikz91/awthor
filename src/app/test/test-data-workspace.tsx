"use client";

import {
  ArrowLeft,
  Braces,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  HardDrive,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  awthorStoragePrefix,
  backupFormat,
  backupVersion,
  createBackup,
  createSeedStorageEntries,
  seedSummary,
} from "./seed-data";

const backupSchema = z.object({
  format: z.literal(backupFormat),
  version: z.literal(backupVersion),
  exportedAt: z.string(),
  entries: z.record(z.string(), z.string()),
});

type Inventory = {
  entries: Record<string, string>;
  bytes: number;
};

type Notice = {
  tone: "success" | "error" | "neutral";
  text: string;
};

const emptyInventory: Inventory = { entries: {}, bytes: 0 };
const initialPreview = JSON.stringify(
  createBackup(createSeedStorageEntries(), "2026-08-28T09:30:00.000Z"),
  null,
  2,
);

function isAwthorStorageKey(key: string) {
  return key === "awthor-theme" || key.startsWith(`${awthorStoragePrefix}:`);
}

function readAwthorEntries(): Record<string, string> {
  const entries: Record<string, string> = {};

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key && isAwthorStorageKey(key)) {
      const value = window.localStorage.getItem(key);
      if (value !== null) {
        entries[key] = value;
      }
    }
  }

  return Object.fromEntries(
    Object.entries(entries).sort(([first], [second]) => first.localeCompare(second)),
  );
}

function clearAwthorEntries() {
  for (const key of Object.keys(readAwthorEntries())) {
    window.localStorage.removeItem(key);
  }
}

function writeEntries(entries: Record<string, string>) {
  for (const [key, value] of Object.entries(entries)) {
    window.localStorage.setItem(key, value);
  }
}

function inventoryFrom(entries: Record<string, string>): Inventory {
  return {
    entries,
    bytes: new Blob(Object.entries(entries).flat()).size,
  };
}

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}

function downloadBackup(entries: Record<string, string>) {
  const backup = createBackup(entries);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = backup.exportedAt.slice(0, 10);

  anchor.href = url;
  anchor.download = `awthor-backup-${date}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  return backup;
}

export function TestDataWorkspace() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inventory, setInventory] = useState<Inventory>(emptyInventory);
  const [preview, setPreview] = useState(initialPreview);
  const [previewLabel, setPreviewLabel] = useState("Seed preview");
  const [notice, setNotice] = useState<Notice>({
    tone: "neutral",
    text: "Reading this browser's Awthor storage…",
  });
  const [isReady, setIsReady] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const refreshInventory = useCallback((message?: string) => {
    try {
      const entries = readAwthorEntries();
      setInventory(inventoryFrom(entries));
      setPreview(JSON.stringify(createBackup(entries), null, 2));
      setPreviewLabel("Current local data");
      setNotice({
        tone: "success",
        text:
          message ??
          (Object.keys(entries).length
            ? "Awthor local data is available in this browser."
            : "No Awthor local data is currently stored."),
      });
    } catch {
      setNotice({
        tone: "error",
        text: "This browser did not allow Awthor to read local storage.",
      });
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    refreshInventory();
  }, [refreshInventory]);

  function seedData() {
    const existingCount = Object.keys(inventory.entries).length;
    if (
      existingCount > 0 &&
      !window.confirm(
        "Replace all existing Awthor data in this browser with the complete demo dataset?",
      )
    ) {
      return;
    }

    const previousEntries = readAwthorEntries();

    try {
      const entries = createSeedStorageEntries(new Date().toISOString());
      clearAwthorEntries();
      writeEntries(entries);
      refreshInventory(
        "Seeded the author, theme, 4 books, 43 chapters, characters, plots, notes, and settings.",
      );
    } catch {
      clearAwthorEntries();
      writeEntries(previousEntries);
      setNotice({
        tone: "error",
        text: "Seeding failed. The previous Awthor data was restored.",
      });
    }
  }

  function clearData() {
    if (
      !window.confirm(
        "Clear all Awthor data from this browser? Export a backup first if you may need it later.",
      )
    ) {
      return;
    }

    try {
      clearAwthorEntries();
      refreshInventory("All Awthor local data was removed from this browser.");
    } catch {
      setNotice({
        tone: "error",
        text: "Awthor local data could not be cleared.",
      });
    }
  }

  function exportData() {
    try {
      const entries = readAwthorEntries();
      const backup = downloadBackup(entries);
      setPreview(JSON.stringify(backup, null, 2));
      setPreviewLabel("Last exported backup");
      setNotice({
        tone: "success",
        text: `Downloaded a portable JSON backup with ${Object.keys(entries).length} entries.`,
      });
    } catch {
      setNotice({
        tone: "error",
        text: "The JSON backup could not be created.",
      });
    }
  }

  async function importData(file: File) {
    setIsImporting(true);

    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Backup files must be smaller than 10 MB.");
      }

      const parsed: unknown = JSON.parse(await file.text());
      const backup = backupSchema.parse(parsed);
      const invalidKey = Object.keys(backup.entries).find((key) => !isAwthorStorageKey(key));

      if (invalidKey) {
        throw new Error("The backup contains a non-Awthor storage key.");
      }

      if (
        Object.keys(inventory.entries).length > 0 &&
        !window.confirm("Replace all current Awthor data in this browser with the selected backup?")
      ) {
        return;
      }

      const previousEntries = readAwthorEntries();

      try {
        clearAwthorEntries();
        writeEntries(backup.entries);
      } catch (error) {
        clearAwthorEntries();
        writeEntries(previousEntries);
        throw error;
      }

      refreshInventory(
        "Imported " +
          Object.keys(backup.entries).length +
          " Awthor entries from " +
          file.name +
          ".",
      );
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "The selected backup could not be imported.",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  const entryCount = Object.keys(inventory.entries).length;
  const noticeClass =
    notice.tone === "error"
      ? "border-destructive/25 bg-destructive/10 text-destructive"
      : notice.tone === "success"
        ? "border-primary/20 bg-primary/10 text-primary"
        : "border-border bg-muted text-muted-foreground";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
          <Link
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-foreground"
            href="/books"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to library
          </Link>
          <Badge className="gap-1.5" variant="outline">
            <HardDrive aria-hidden="true" className="size-3.5" />
            Browser-local only
          </Badge>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
        <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
              <Database aria-hidden="true" className="size-4" />
              Developer utility
            </div>
            <h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Local data lab
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Populate a complete demo workspace, reset this origin, or move the exact local state
              between browsers with a JSON backup.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex">
            <div className="rounded-2xl border border-border bg-card px-4 py-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Stored entries
              </p>
              <p className="mt-1 font-heading text-2xl font-semibold">
                {isReady ? entryCount : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Approx. size
              </p>
              <p className="mt-1 font-heading text-2xl font-semibold">
                {isReady ? formatBytes(inventory.bytes) : "—"}
              </p>
            </div>
          </div>
        </section>

        <div
          aria-live="polite"
          className={`mt-7 rounded-2xl border px-4 py-3 text-sm font-semibold ${noticeClass}`}
        >
          <span className="inline-flex items-center gap-2">
            {notice.tone === "error" ? (
              <ShieldAlert aria-hidden="true" className="size-4" />
            ) : (
              <CheckCircle2 aria-hidden="true" className="size-4" />
            )}
            {notice.text}
          </span>
        </div>

        <section
          aria-label="Local data actions"
          className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <ActionCard
            description="Replace Awthor storage with a complete, realistic demo workspace."
            icon={Database}
            title="Seed data"
          >
            <Button className="w-full" disabled={!isReady} onClick={seedData} size="lg">
              <Database aria-hidden="true" />
              Seed or replace
            </Button>
          </ActionCard>

          <ActionCard
            description="Remove every Awthor-owned key while preserving unrelated site data."
            icon={Trash2}
            title="Unseed"
          >
            <Button
              className="w-full"
              disabled={!isReady || entryCount === 0}
              onClick={clearData}
              size="lg"
              variant="destructive"
            >
              <Trash2 aria-hidden="true" />
              Clear Awthor data
            </Button>
          </ActionCard>

          <ActionCard
            description="Download the current raw storage entries in a portable JSON envelope."
            icon={Download}
            title="Export"
          >
            <Button
              className="w-full"
              disabled={!isReady || entryCount === 0}
              onClick={exportData}
              size="lg"
              variant="outline"
            >
              <Download aria-hidden="true" />
              Export JSON
            </Button>
          </ActionCard>

          <ActionCard
            description="Validate and restore a JSON file previously exported from this page."
            icon={Upload}
            title="Import"
          >
            <input
              accept="application/json,.json"
              aria-label="Choose an Awthor JSON backup"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void importData(file);
                }
              }}
              ref={fileInputRef}
              type="file"
            />
            <Button
              className="w-full"
              disabled={!isReady || isImporting}
              onClick={() => fileInputRef.current?.click()}
              size="lg"
              variant="outline"
            >
              <Upload aria-hidden="true" />
              {isImporting ? "Importing…" : "Choose backup"}
            </Button>
          </ActionCard>
        </section>

        <section className="mt-7 grid items-start gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          <Card className="bg-card shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Seed contents</CardTitle>
              <CardDescription>
                The bundled dataset is large enough to exercise list, detail, relationship, and
                backup flows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3">
                {Object.entries(seedSummary).map(([label, value]) => (
                  <div className="rounded-xl bg-muted/70 px-3.5 py-3" key={label}>
                    <dt className="text-[11px] font-extrabold uppercase tracking-[0.11em] text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-1 font-heading text-xl font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 rounded-xl border border-border bg-background/70 p-4 text-xs leading-5 text-muted-foreground">
                <p className="font-bold text-foreground">Included settings</p>
                <p className="mt-1">
                  Author profile, paper theme, editor preferences, active book, and backup reminder.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#20231f] text-[#e9eadf] shadow-none ring-black/10">
            <CardHeader className="border-b border-white/10 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl text-white">
                    <Braces aria-hidden="true" className="size-5 text-[#aebc95]" />
                    JSON dump
                  </CardTitle>
                  <CardDescription className="mt-1 text-[#a7aa9f]">{previewLabel}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="border-white/15 bg-transparent text-[#e9eadf] hover:bg-white/10 hover:text-white"
                    onClick={() => {
                      setPreview(initialPreview);
                      setPreviewLabel("Seed preview");
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <FileJson aria-hidden="true" />
                    Seed
                  </Button>
                  <Button
                    className="border-white/15 bg-transparent text-[#e9eadf] hover:bg-white/10 hover:text-white"
                    onClick={() => refreshInventory()}
                    size="sm"
                    variant="outline"
                  >
                    <RefreshCw aria-hidden="true" />
                    Current
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[42rem] overflow-auto rounded-xl bg-black/20 p-4 font-mono text-[11px] leading-5 text-[#d8dacd]">
                <code>{preview}</code>
              </pre>
            </CardContent>
          </Card>
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
          This page never sends data to a server. Imported files are read in the browser and written
          only to this origin&apos;s local storage.
        </p>
      </div>
    </main>
  );
}

function ActionCard({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  description: string;
  icon: typeof Database;
  title: string;
}) {
  return (
    <Card className="bg-card shadow-none">
      <CardHeader>
        <div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-4.5" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="min-h-10 leading-5">{description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">{children}</CardContent>
    </Card>
  );
}
