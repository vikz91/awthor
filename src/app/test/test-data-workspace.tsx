"use client";

import {
  ArrowLeft,
  Braces,
  CheckCircle2,
  Database,
  Download,
  FileArchive,
  FileJson,
  HardDrive,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { backupArchiveFilename, createBackupArchive, parseBackupFile } from "@/lib/backup/archive";
import {
  type AwthorBackupV2,
  awthorBackupFormat,
  awthorBackupVersion,
  createSeedRepositoryData,
  getAwthorRepository,
  hasSeedRepositoryData,
  type RepositoryData,
  seedRepositoryBookIds,
  seedRepositorySummary,
  unseedRepositoryData,
} from "@/lib/repository";

type Inventory = {
  books: number;
  chapters: number;
  characters: number;
  bytes: number;
  hasData: boolean;
  hasSeedData: boolean;
};

type Notice = {
  tone: "success" | "error" | "neutral";
  text: string;
};

const emptyInventory: Inventory = {
  books: 0,
  chapters: 0,
  characters: 0,
  bytes: 0,
  hasData: false,
  hasSeedData: false,
};
const seedPreviewBackup: AwthorBackupV2 = {
  format: awthorBackupFormat,
  version: awthorBackupVersion,
  exportedAt: "2026-08-28T09:30:00.000Z",
  data: createSeedRepositoryData(),
};
const initialPreview = JSON.stringify(seedPreviewBackup, null, 2);

function inventoryFrom(data: RepositoryData): Inventory {
  const serialized = JSON.stringify(data);

  return {
    books: data.books.length,
    chapters: Object.values(data.chapters).reduce((total, chapters) => total + chapters.length, 0),
    characters: Object.values(data.characters).reduce(
      (total, characters) => total + characters.length,
      0,
    ),
    bytes: new Blob([serialized]).size,
    hasData: data.profile !== null || data.books.length > 0,
    hasSeedData: hasSeedRepositoryData(data),
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

function downloadBackup(archive: Uint8Array, exportedAt: string) {
  const blob = new Blob([Uint8Array.from(archive).buffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = backupArchiveFilename(exportedAt);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function TestDataWorkspace() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inventory, setInventory] = useState<Inventory>(emptyInventory);
  const [preview, setPreview] = useState(initialPreview);
  const [previewLabel, setPreviewLabel] = useState("Seed preview");
  const [notice, setNotice] = useState<Notice>({
    tone: "neutral",
    text: "Reading this browser's Awthor repository…",
  });
  const [isReady, setIsReady] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [canRetryMigration, setCanRetryMigration] = useState(false);

  const refreshInventory = useCallback(async (message?: string, retryMigration = false) => {
    const repository = getAwthorRepository();

    try {
      const migration = retryMigration
        ? await repository.retryMigration()
        : await repository.initialize();

      if (migration.status === "failed") {
        setCanRetryMigration(true);
        setNotice({
          tone: "error",
          text: "The IndexedDB migration could not finish. Previous browser data was left untouched.",
        });
        return;
      }

      const [data, backup] = await Promise.all([repository.getData(), repository.exportBackup()]);
      const nextInventory = inventoryFrom(data);
      setInventory(nextInventory);
      setPreview(JSON.stringify(backup, null, 2));
      setPreviewLabel("Current v2 backup");
      setCanRetryMigration(false);
      setNotice({
        tone: "success",
        text:
          message ??
          (nextInventory.hasData
            ? "Awthor IndexedDB data is available in this browser."
            : "No Awthor books or author profile are currently stored."),
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "This browser did not allow Awthor to read its local repository.",
      });
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void refreshInventory();
  }, [refreshInventory]);

  async function seedData() {
    if (
      inventory.hasData &&
      !window.confirm("Replace all existing Awthor data with the demo workspace?")
    ) {
      return;
    }

    try {
      await getAwthorRepository().replaceData(createSeedRepositoryData(new Date().toISOString()));
      await refreshInventory("Seeded two fully populated Markdown books with three chapters each.");
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "The demo workspace could not be seeded.",
      });
    }
  }

  async function unseedData() {
    try {
      const repository = getAwthorRepository();
      const data = await repository.getData();
      const seedBookIds = new Set<string>(seedRepositoryBookIds);
      const seededBookCount = data.books.filter((book) => seedBookIds.has(book.id)).length;

      if (seededBookCount === 0) {
        await refreshInventory("No seeded books were found in this browser.");
        return;
      }

      if (
        !window.confirm(
          `Remove ${seededBookCount} seeded book${seededBookCount === 1 ? "" : "s"} from this browser?`,
        )
      ) {
        return;
      }

      const removedCount = await unseedRepositoryData(repository);
      await refreshInventory(
        `Removed ${removedCount} seeded book${removedCount === 1 ? "" : "s"} from this browser.`,
      );
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "The seeded books could not be removed.",
      });
    }
  }

  async function exportData() {
    setIsExporting(true);

    try {
      const backup = await getAwthorRepository().exportBackup();
      downloadBackup(createBackupArchive(backup), backup.exportedAt);
      setPreview(JSON.stringify(backup, null, 2));
      setPreviewLabel("Last exported ZIP contents");
      setNotice({
        tone: "success",
        text: "Downloaded an unencrypted Awthor ZIP backup.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "The ZIP backup could not be created.",
      });
    } finally {
      setIsExporting(false);
    }
  }

  async function importData(file: File) {
    setIsImporting(true);

    try {
      const parsed = parseBackupFile(new Uint8Array(await file.arrayBuffer()));
      const contents = parsed.summary
        ? `${parsed.summary.books} book${parsed.summary.books === 1 ? "" : "s"}, ${parsed.summary.chapters} chapter${parsed.summary.chapters === 1 ? "" : "s"}, and ${parsed.summary.characters} character${parsed.summary.characters === 1 ? "" : "s"}`
        : "a legacy Awthor workspace";

      if (
        inventory.hasData &&
        !window.confirm(`Replace all current Awthor data with ${contents} from ${file.name}?`)
      ) {
        return;
      }

      const result = await getAwthorRepository().importBackup(parsed.backup);
      const discarded = result.discarded.notes + result.discarded.plots;
      const migrationMessage =
        result.importedVersion === 1
          ? ` Imported the v1 backup into current storage; ${discarded} legacy Notes/Plots record${discarded === 1 ? " was" : "s were"} discarded.`
          : " Imported the schema-v2 backup.";
      await refreshInventory(`${file.name} restored.${migrationMessage}`);
      setPreview(JSON.stringify(parsed.backup, null, 2));
      setPreviewLabel(
        parsed.kind === "archive" ? "Last imported ZIP contents" : "Last imported JSON backup",
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
              Seed the IndexedDB repository, inspect its portable backup, or verify import and
              migration behavior without bypassing Awthor&apos;s data boundary.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InventoryStat label="Books" value={isReady ? inventory.books : "—"} />
            <InventoryStat label="Chapters" value={isReady ? inventory.chapters : "—"} />
            <InventoryStat label="Characters" value={isReady ? inventory.characters : "—"} />
            <InventoryStat
              label="Approx. size"
              value={isReady ? formatBytes(inventory.bytes) : "—"}
            />
          </div>
        </section>

        <div
          aria-live="polite"
          className={`mt-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${noticeClass}`}
        >
          <span className="inline-flex items-center gap-2">
            {notice.tone === "error" ? (
              <ShieldAlert aria-hidden="true" className="size-4" />
            ) : (
              <CheckCircle2 aria-hidden="true" className="size-4" />
            )}
            {notice.text}
          </span>
          {canRetryMigration ? (
            <Button
              onClick={() => void refreshInventory(undefined, true)}
              size="sm"
              variant="outline"
            >
              <RefreshCw aria-hidden="true" />
              Retry migration
            </Button>
          ) : null}
        </div>

        <section
          aria-label="Local data actions"
          className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <ActionCard
            description="Replace the repository with two complete books, six Markdown chapters, characters, and chapter arcs."
            icon={Database}
            title="Seed local data"
          >
            <Button
              className="w-full"
              disabled={!isReady}
              onClick={() => void seedData()}
              size="lg"
            >
              <Database aria-hidden="true" />
              Seed or replace
            </Button>
          </ActionCard>

          <ActionCard
            description="Remove only the known fixture books; unrelated books are preserved."
            icon={Trash2}
            title="Unseed local data"
          >
            <Button
              className="w-full"
              disabled={!isReady || !inventory.hasSeedData}
              onClick={() => void unseedData()}
              size="lg"
              variant="destructive"
            >
              <Trash2 aria-hidden="true" />
              Remove seed data
            </Button>
          </ActionCard>

          <ActionCard
            description="ZIP the IndexedDB and app settings snapshots locally. The archive is not encrypted."
            icon={FileArchive}
            title="Export"
          >
            <Button
              className="w-full"
              disabled={!isReady || isExporting}
              onClick={() => void exportData()}
              size="lg"
              variant="outline"
            >
              <Download aria-hidden="true" />
              {isExporting ? "Creating ZIP…" : "Export ZIP"}
            </Button>
          </ActionCard>

          <ActionCard
            description="Restore Awthor ZIP archives, or import supported legacy JSON backups."
            icon={Upload}
            title="Import"
          >
            <input
              accept="application/zip,.zip,.awthor.zip,application/json,.json"
              aria-label="Choose an Awthor ZIP or JSON backup"
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
                Two complete fixtures for the library, reader, writer, and in-place tools.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3">
                {Object.entries(seedRepositorySummary).map(([label, value]) => (
                  <div className="rounded-xl bg-muted/70 px-3.5 py-3" key={label}>
                    <dt className="text-[11px] font-extrabold uppercase tracking-[0.11em] text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-1 font-heading text-xl font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 rounded-xl border border-border bg-background/70 p-4 text-xs leading-5 text-muted-foreground">
                <p className="font-bold text-foreground">Included data</p>
                <p className="mt-1">
                  Complete book metadata, remote covers, six Markdown chapters, four character
                  dossiers, reading positions, proofreading preferences, and chapter arcs.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted text-foreground shadow-none">
            <CardHeader className="border-b border-border pb-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Braces aria-hidden="true" className="size-5 text-primary" />
                    JSON dump
                  </CardTitle>
                  <CardDescription className="mt-1">{previewLabel}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
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
                  <Button onClick={() => void refreshInventory()} size="sm" variant="outline">
                    <RefreshCw aria-hidden="true" />
                    Current
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[42rem] overflow-auto rounded-xl border border-border bg-background p-4 font-mono text-[11px] leading-5 text-foreground">
                <code>{preview}</code>
              </pre>
            </CardContent>
          </Card>
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
          This page never sends data to a server. Backups are not encrypted, so anyone with the ZIP
          can read the manuscript and author details. Imports are validated and passed through
          AwthorRepository before being stored on this device.
        </p>
      </div>
    </main>
  );
}

function InventoryStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-heading text-2xl font-semibold">{value}</p>
    </div>
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
