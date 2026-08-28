"use client";

import { ArrowLeft, ArrowRight, Check, Feather, HardDrive, Moon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAwthorRepository, type OnboardingDetails, type Theme } from "@/lib/repository";

const repository = getAwthorRepository();

const defaultDetails: OnboardingDetails = {
  authorName: "Alex Parker",
  contactEmail: "alex.parker@example.com",
  theme: "paper",
  website: "https://alexparker.example",
};

const themeOptions: Array<{
  value: Theme;
  label: string;
  description: string;
  icon: typeof Feather;
}> = [
  { value: "paper", label: "Paper", description: "Warm and focused", icon: Feather },
  { value: "stone", label: "Stone", description: "Low-glare and relaxed", icon: Moon },
];

export function OnboardingFlow() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [details, setDetails] = useState(defaultDetails);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    repository.profile.get().then(
      (stored) => {
        if (!active) {
          return;
        }

        if (stored) {
          setDetails(stored);
        }
        setIsReady(true);
      },
      () => {
        if (active) {
          setError("Your saved profile could not be read. You can still update it below.");
          setIsReady(true);
        }
      },
    );

    return () => {
      active = false;
    };
  }, []);

  function updateDetails<Key extends keyof OnboardingDetails>(
    field: Key,
    value: OnboardingDetails[Key],
  ) {
    setDetails((current) => ({ ...current, [field]: value }));
  }

  function selectTheme(theme: Theme) {
    updateDetails("theme", theme);
    setTheme(theme);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const savedDetails = { ...details, theme };

    try {
      await Promise.all([
        repository.profile.save(savedDetails),
        repository.theme.save(savedDetails.theme),
      ]);
      setDetails(savedDetails);
      router.push("/books");
    } catch {
      setError(
        "Awthor could not save to this browser. Check its storage permissions and try again.",
      );
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-card/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link className="flex items-center gap-2.5 font-heading text-lg font-semibold" href="/">
            <BrandMark size={34} />
            awthor
          </Link>
          <Badge className="gap-1.5" variant="outline">
            <HardDrive aria-hidden="true" className="size-3.5" />
            Saved on this device
          </Badge>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:py-16">
        <form onSubmit={saveProfile}>
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
            href="/books"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to books
          </Link>

          <div className="mt-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Your writing space
            </p>
            <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Make Awthor yours.
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Your profile and preferences stay in this browser and can be changed at any time.
            </p>
          </div>

          <Card className="mt-8 shadow-none">
            <CardHeader>
              <CardTitle>Author details</CardTitle>
              <CardDescription>How you want to appear in your private workspace.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field label="Name" htmlFor="author-name">
                <Input
                  autoComplete="name"
                  id="author-name"
                  onChange={(event) => updateDetails("authorName", event.target.value)}
                  required
                  value={details.authorName}
                />
              </Field>
              <Field label="Contact email" htmlFor="contact-email">
                <Input
                  autoComplete="email"
                  id="contact-email"
                  onChange={(event) => updateDetails("contactEmail", event.target.value)}
                  required
                  type="email"
                  value={details.contactEmail}
                />
              </Field>
              <Field label="Website" htmlFor="website">
                <Input
                  autoComplete="url"
                  id="website"
                  onChange={(event) => updateDetails("website", event.target.value)}
                  placeholder="https://yourwebsite.com"
                  type="url"
                  value={details.website}
                />
              </Field>
            </CardContent>
          </Card>

          <Card className="mt-6 shadow-none">
            <CardHeader>
              <CardTitle>App theme</CardTitle>
              <CardDescription>
                Choose a comfortable canvas for long writing sessions.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {themeOptions.map((option) => {
                const active = theme === option.value;
                return (
                  <button
                    aria-pressed={active}
                    className={`rounded-xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                      active ? "border-primary bg-primary/8" : "border-border hover:bg-muted/60"
                    }`}
                    key={option.value}
                    onClick={() => selectTheme(option.value)}
                    type="button"
                  >
                    <div className="flex items-center justify-between">
                      <option.icon aria-hidden="true" className="size-4" />
                      {active ? <Check aria-hidden="true" className="size-4 text-primary" /> : null}
                    </div>
                    <p className="mt-4 font-bold">{option.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {error ? (
            <p className="mt-4 text-sm font-semibold text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex justify-end">
            <Button disabled={!isReady || isSaving} type="submit">
              {isSaving ? "Saving…" : "Save and continue"}
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </form>

        <aside className="lg:pt-28">
          <Card className="sticky top-8 bg-muted/40 shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Local by design</CardTitle>
              <CardDescription>
                Awthor writes your profile and story workspace to this browser. No manuscript data
                is sent to a server.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Fast offline access</p>
              <p>No account required</p>
              <p>Your contact details stay private</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function Field({
  children,
  className,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-2" htmlFor={htmlFor}>
        {label}
      </Label>
      {children}
    </div>
  );
}
