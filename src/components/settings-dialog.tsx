"use client";

import { HardDrive, LoaderCircle, Moon, Sun } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { ProofreadingDialectSelect } from "@/components/proofreading-dialect-select";
import { SyncControl } from "@/components/sync-control";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DrawerBody, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkspaceInspector } from "@/components/ui/workspace-inspector";
import { getAwthorRepository, type OnboardingDetails, type Theme } from "@/lib/repository";
import { cn } from "@/lib/utils";

const repository = getAwthorRepository();

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (profile: OnboardingDetails) => void;
};

type SettingsSurfaceProps = SettingsDialogProps & {
  presentation: "dialog" | "inspector";
};

const emptyProfile: OnboardingDetails = {
  authorName: "",
  contactEmail: "",
  defaultProofreadingDialect: "american",
  website: "",
  theme: "paper",
};

export function SettingsDialog({ onSaved, open, onOpenChange }: SettingsDialogProps) {
  return (
    <SettingsSurface
      onOpenChange={onOpenChange}
      onSaved={onSaved}
      open={open}
      presentation="dialog"
    />
  );
}

export function SettingsInspector({ onSaved, open, onOpenChange }: SettingsDialogProps) {
  return (
    <SettingsSurface
      onOpenChange={onOpenChange}
      onSaved={onSaved}
      open={open}
      presentation="inspector"
    />
  );
}

function SettingsSurface({ onSaved, open, onOpenChange, presentation }: SettingsSurfaceProps) {
  const { theme: activeTheme, setTheme } = useTheme();
  const [profile, setProfile] = useState<OnboardingDetails>(emptyProfile);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let current = true;
    setLoading(true);
    setError(null);

    async function loadSettings() {
      const migration = await repository.initialize();
      if (migration.status === "failed") {
        throw migration.error;
      }

      const [savedProfile, savedTheme] = await Promise.all([
        repository.profile.get(),
        repository.theme.get(),
      ]);

      if (current) {
        setProfile({
          ...(savedProfile ?? emptyProfile),
          theme: savedTheme ?? savedProfile?.theme ?? activeTheme,
        });
      }
    }

    loadSettings()
      .catch((cause: unknown) => {
        if (current) {
          setError(cause instanceof Error ? cause.message : "Settings could not be loaded.");
        }
      })
      .finally(() => {
        if (current) {
          setLoading(false);
        }
      });

    return () => {
      current = false;
    };
  }, [activeTheme, open]);

  function updateField<Field extends keyof OnboardingDetails>(
    field: Field,
    value: OnboardingDetails[Field],
  ) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const nextProfile: OnboardingDetails = {
      authorName: profile.authorName.trim(),
      contactEmail: profile.contactEmail.trim(),
      defaultProofreadingDialect: profile.defaultProofreadingDialect,
      website: profile.website.trim(),
      theme: profile.theme,
    };

    try {
      await Promise.all([
        repository.profile.save(nextProfile),
        repository.theme.save(nextProfile.theme),
      ]);
      setTheme(nextProfile.theme);
      onSaved?.(nextProfile);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const formId =
    presentation === "inspector" ? "awthor-inspector-settings-form" : "awthor-settings-form";
  const editor = loading ? (
    <div className="flex min-h-64 items-center justify-center text-muted-foreground">
      <LoaderCircle aria-hidden="true" className="mr-2 size-4 animate-spin" />
      Loading settings…
    </div>
  ) : (
    <form className="@container grid gap-5" id={formId} onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="settings-author-name">Author name</Label>
        <Input
          autoComplete="name"
          id="settings-author-name"
          onChange={(event) => updateField("authorName", event.target.value)}
          placeholder="Your pen name"
          required
          value={profile.authorName}
        />
      </div>

      <div className="grid gap-4 @min-[34rem]:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="settings-email">Email</Label>
          <Input
            autoComplete="email"
            id="settings-email"
            onChange={(event) => updateField("contactEmail", event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={profile.contactEmail}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="settings-website">Website</Label>
          <Input
            autoComplete="url"
            id="settings-website"
            onChange={(event) => updateField("website", event.target.value)}
            placeholder="https://example.com"
            type="url"
            value={profile.website}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="settings-proofreading-dialect">Default target language</Label>
        <ProofreadingDialectSelect
          id="settings-proofreading-dialect"
          onChange={(dialect) => updateField("defaultProofreadingDialect", dialect)}
          value={profile.defaultProofreadingDialect}
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Books use this English dialect until you choose a book-specific one.
        </p>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Theme</legend>
        <div className="grid grid-cols-2 gap-2">
          <ThemeChoice
            checked={profile.theme === "paper"}
            description="Warm and bright"
            icon={Sun}
            label="Paper"
            onChange={() => updateField("theme", "paper")}
            value="paper"
          />
          <ThemeChoice
            checked={profile.theme === "stone"}
            description="Low-glare reading"
            icon={Moon}
            label="Stone"
            onChange={() => updateField("theme", "stone")}
            value="stone"
          />
        </div>
      </fieldset>

      <SyncControl variant="settings" />

      <div className="flex items-start gap-2 rounded-xl bg-muted px-3 py-2.5 text-xs leading-5 text-muted-foreground">
        <HardDrive aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        Awthor stays local until you explicitly sync. Afterward, edits can follow your signed-in
        account between devices.
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  );
  const footer = (
    <>
      <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
        Cancel
      </Button>
      <Button disabled={loading || saving} form={formId} type="submit">
        {saving && <LoaderCircle aria-hidden="true" className="animate-spin" />}
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </>
  );

  if (presentation === "inspector") {
    return (
      <WorkspaceInspector onOpenChange={onOpenChange} open={open}>
        <DrawerHeader>
          <DrawerTitle>Settings</DrawerTitle>
          <DrawerDescription>
            Your author profile, proofreading language, and reading theme. These stay local until
            you choose to sync.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="@container px-4 py-5 sm:px-6">
          {editor}
          <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t border-border bg-popover/95 pt-4 pb-[max(0rem,env(safe-area-inset-bottom))] backdrop-blur">
            {footer}
          </div>
        </DrawerBody>
      </WorkspaceInspector>
    );
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Settings</DialogTitle>
          <DialogDescription>
            A compact author profile, proofreading language, and reading theme. These stay local
            until you choose to sync.
          </DialogDescription>
        </DialogHeader>
        {editor}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ThemeChoiceProps = {
  checked: boolean;
  description: string;
  icon: typeof Sun;
  label: string;
  onChange: () => void;
  value: Theme;
};

function ThemeChoice({
  checked,
  description,
  icon: Icon,
  label,
  onChange,
  value,
}: ThemeChoiceProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted",
        checked && "border-primary bg-primary/5 ring-2 ring-primary/15",
      )}
    >
      <input
        checked={checked}
        className="sr-only"
        name="settings-theme"
        onChange={onChange}
        type="radio"
        value={value}
      />
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}
