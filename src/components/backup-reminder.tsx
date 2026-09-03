"use client";

import { ArrowRight, Download, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getBackupReminderDelay } from "@/lib/backup-reminder";
import { createDefaultAppSettings, getAwthorRepository } from "@/lib/repository";

const repository = getAwthorRepository();

function isWritingRoute(pathname: string): boolean {
  return pathname === "/books" || pathname.startsWith("/books/");
}

export function BackupReminder() {
  const pathname = usePathname();
  const eligibleRoute = isWritingRoute(pathname);
  const [due, setDue] = useState(false);
  const [visible, setVisible] = useState(false);
  const checkedThisSessionRef = useRef(false);
  const scheduledLastShownAtRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (checkedThisSessionRef.current) {
      return;
    }

    let active = true;

    async function scheduleReminder() {
      const migration = await repository.initialize();
      if (migration.status === "failed") {
        throw migration.error;
      }

      const settings = (await repository.settings.get()) ?? createDefaultAppSettings();
      if (!active) {
        return;
      }

      checkedThisSessionRef.current = true;
      if (!settings.backupReminder.enabled) {
        return;
      }

      const scheduledLastShownAt = settings.backupReminder.lastShownAt;
      scheduledLastShownAtRef.current = scheduledLastShownAt;
      const delay = getBackupReminderDelay(scheduledLastShownAt);
      if (delay === null) {
        return;
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (active) {
          setDue(true);
        }
      }, delay);
    }

    void scheduleReminder().catch(() => {
      // Repository errors are surfaced by the product screens that can recover from them.
    });

    return () => {
      active = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!due || !eligibleRoute) {
      return;
    }

    let active = true;

    async function showReminder() {
      const latestSettings = (await repository.settings.get()) ?? createDefaultAppSettings();
      const latestReminder = latestSettings.backupReminder;

      if (!active || !latestReminder.enabled) {
        return;
      }

      if (
        latestReminder.lastShownAt !== scheduledLastShownAtRef.current &&
        getBackupReminderDelay(latestReminder.lastShownAt) !== 0
      ) {
        setDue(false);
        return;
      }

      const shownAt = new Date().toISOString();
      await repository.settings.save(
        {
          ...latestSettings,
          backupReminder: {
            enabled: true,
            frequency: "weekly",
            lastShownAt: shownAt,
          },
        },
        { syncPolicy: "local-only", reason: "backup-reminder" },
      );

      if (active) {
        setDue(false);
        setVisible(true);
      }
    }

    void showReminder().catch(() => {
      if (active) {
        setDue(false);
      }
    });

    return () => {
      active = false;
    };
  }, [due, eligibleRoute]);

  if (!eligibleRoute || !visible) {
    return null;
  }

  return (
    <aside
      aria-label="Weekly backup reminder"
      className="fixed top-20 right-4 left-4 z-70 flex gap-2 rounded-2xl border border-border/80 bg-popover/95 p-2 text-popover-foreground shadow-xl shadow-foreground/10 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 sm:left-auto sm:w-96 motion-reduce:animate-none"
    >
      <p aria-live="polite" className="sr-only">
        It is time to back up your Awthor data.
      </p>
      <Link
        aria-label="Open backup tools"
        className="group flex min-w-0 flex-1 items-start gap-3 rounded-xl p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href="/test"
        onClick={() => setVisible(false)}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Download aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Weekly local backup
          </span>
          <span className="mt-0.5 block font-heading text-sm font-semibold">
            Keep your writing safe
          </span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            Download a portable copy of your books and settings.
          </span>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary">
            Open backup tools
            <ArrowRight
              aria-hidden="true"
              className="size-3 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
          </span>
        </span>
      </Link>
      <Button
        aria-label="Dismiss backup reminder"
        className="mt-0.5"
        onClick={() => setVisible(false)}
        size="icon-sm"
        title="Dismiss"
        variant="ghost"
      >
        <X aria-hidden="true" className="size-3.5" />
      </Button>
    </aside>
  );
}
