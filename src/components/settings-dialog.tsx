"use client";

import { HardDrive, LoaderCircle, Moon, Sun } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAwthorRepository, type OnboardingDetails, type Theme } from "@/lib/repository";
import { cn } from "@/lib/utils";

const repository = getAwthorRepository();

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (profile: OnboardingDetails) => void;
};

const emptyProfile: OnboardingDetails = {
  authorName: "",
  contactEmail: "",
  website: "",
  theme: "paper",
};

export function SettingsDialog({ onSaved, open, onOpenChange }: SettingsDialogProps) {
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

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Settings</DialogTitle>
          <DialogDescription>
            A compact author profile and reading theme. These details stay on this device.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center text-muted-foreground">
            <LoaderCircle aria-hidden="true" className="mr-2 size-4 animate-spin" />
            Loading settings…
          </div>
        ) : (
          <form className="grid gap-5" id="awthor-settings-form" onSubmit={handleSubmit}>
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

            <div className="grid gap-4 sm:grid-cols-2">
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

            <div className="flex items-start gap-2 rounded-xl bg-muted px-3 py-2.5 text-xs leading-5 text-muted-foreground">
              <HardDrive aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              Awthor stores this profile and your manuscripts in this browser, not on an Awthor
              server.
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </form>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={loading || saving} form="awthor-settings-form" type="submit">
            {saving && <LoaderCircle aria-hidden="true" className="animate-spin" />}
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </DialogFooter>
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
