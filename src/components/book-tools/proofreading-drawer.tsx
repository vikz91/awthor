"use client";

import { AlertCircle, Check, Languages, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProofreadingDialectSelect } from "@/components/proofreading-dialect-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DrawerBody, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkspaceInspector } from "@/components/ui/workspace-inspector";
import {
  getProofreadingService,
  type ProofreadingIssue,
  type ProofreadingService,
} from "@/lib/proofreading";
import type { BookProofreadingSettings, WorkspaceMode } from "@/lib/repository";

type ProofreadingDrawerProps = {
  open: boolean;
  draft: string;
  mode: WorkspaceMode;
  onApplyDraft: (markdown: string) => void;
  onOpenChange: (open: boolean) => void;
  onPreferencesChange: (preferences: BookProofreadingSettings) => Promise<void>;
  onRequestWrite: () => void;
  preferences: BookProofreadingSettings;
};

type CheckStatus = "idle" | "loading" | "ready" | "stale" | "error";

export function ProofreadingDrawer({
  draft,
  mode,
  onApplyDraft,
  onOpenChange,
  onPreferencesChange,
  onRequestWrite,
  open,
  preferences,
}: ProofreadingDrawerProps) {
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ProofreadingIssue[]>([]);
  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [pendingIssueId, setPendingIssueId] = useState<string | null>(null);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [status, setStatus] = useState<CheckStatus>("idle");
  const [vocabularyInput, setVocabularyInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const checkedSourceRef = useRef<string | null>(null);
  const checkingSourceRef = useRef<string | null>(null);
  const configuredPreferencesRef = useRef<string | null>(null);
  const draftRef = useRef(draft);
  const preferenceWriteTailRef = useRef<Promise<void>>(Promise.resolve());
  const requestRevisionRef = useRef(0);
  const serviceRef = useRef<ProofreadingService | null>(null);
  const pendingPreferenceWritesRef = useRef(0);
  const preferencesRef = useRef(preferences);
  draftRef.current = draft;

  useEffect(() => {
    if (pendingPreferenceWritesRef.current === 0) {
      preferencesRef.current = preferences;
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  const configureService = useCallback(
    async (service: ProofreadingService, nextPreferences: BookProofreadingSettings) => {
      const configurationKey = `${nextPreferences.dialect}\u0000${nextPreferences.words.join("\u0000")}`;
      if (configuredPreferencesRef.current === configurationKey) {
        return;
      }

      await service.setDialect(nextPreferences.dialect);
      await service.initialize();
      await service.clearWords();
      await service.addWords(nextPreferences.words);
      configuredPreferencesRef.current = configurationKey;
    },
    [],
  );

  const runCheck = useCallback(
    async (source: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const revision = ++requestRevisionRef.current;
      checkingSourceRef.current = source;
      checkedSourceRef.current = null;
      setError(null);
      setStatus("loading");

      try {
        const service = serviceRef.current ?? getProofreadingService();
        serviceRef.current = service;
        await configureService(service, localPreferences);
        if (controller.signal.aborted || revision !== requestRevisionRef.current) {
          return;
        }

        const nextIssues = await service.check(source, {
          format: "markdown",
          signal: controller.signal,
        });
        if (controller.signal.aborted || revision !== requestRevisionRef.current) {
          return;
        }

        checkingSourceRef.current = null;
        checkedSourceRef.current = source;
        setIssues(nextIssues);
        setStatus("ready");
      } catch (caughtError) {
        if (controller.signal.aborted || revision !== requestRevisionRef.current) {
          return;
        }

        checkingSourceRef.current = null;
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "The local proofreader could not start. Try again.",
        );
        setStatus("error");
      }
    },
    [configureService, localPreferences],
  );

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      requestRevisionRef.current += 1;
      checkingSourceRef.current = null;
      return;
    }

    void runCheck(draftRef.current);
    return () => abortRef.current?.abort();
  }, [open, runCheck]);

  useEffect(() => {
    if (!open || status === "idle" || status === "error") {
      return;
    }

    const isCurrentSource =
      draft === checkedSourceRef.current || draft === checkingSourceRef.current;
    if (!isCurrentSource) {
      abortRef.current?.abort();
      requestRevisionRef.current += 1;
      checkingSourceRef.current = null;
      setStatus("stale");
    }
  }, [draft, open, status]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const issue of issues) {
      counts.set(issue.categoryLabel, (counts.get(issue.categoryLabel) ?? 0) + 1);
    }
    return [...counts.entries()];
  }, [issues]);

  async function applySuggestion(issue: ProofreadingIssue, suggestionId: string) {
    if (!serviceRef.current || status !== "ready") {
      return;
    }

    setPendingIssueId(issue.id);
    setError(null);
    try {
      const updatedDraft = await serviceRef.current.applySuggestion(draft, issue.id, suggestionId);
      if (mode === "read") {
        onRequestWrite();
      }
      onApplyDraft(updatedDraft);
      await runCheck(updatedDraft);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "That suggestion could not be applied. Recheck the chapter.",
      );
      setStatus("stale");
    } finally {
      setPendingIssueId(null);
    }
  }

  async function ignoreIssue(issueId: string) {
    if (!serviceRef.current || status !== "ready") {
      return;
    }

    setPendingIssueId(issueId);
    setError(null);
    try {
      await serviceRef.current.ignoreIssue(issueId);
      setIssues((current) => current.filter((issue) => issue.id !== issueId));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "That issue could not be ignored. Recheck the chapter.",
      );
    } finally {
      setPendingIssueId(null);
    }
  }

  async function savePreferences(nextPreferences: BookProofreadingSettings) {
    const previousPreferences = preferencesRef.current;
    preferencesRef.current = nextPreferences;
    setLocalPreferences(nextPreferences);
    pendingPreferenceWritesRef.current += 1;
    setSavingPreferences(true);
    setError(null);
    const operation = preferenceWriteTailRef.current.then(() =>
      onPreferencesChange(nextPreferences),
    );
    preferenceWriteTailRef.current = operation.catch(() => undefined);
    try {
      await operation;
      configuredPreferencesRef.current = null;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The proofreading preferences could not be saved on this device.",
      );
      if (preferencesRef.current === nextPreferences) {
        preferencesRef.current = previousPreferences;
        setLocalPreferences(previousPreferences);
      }
    } finally {
      pendingPreferenceWritesRef.current -= 1;
      setSavingPreferences(pendingPreferenceWritesRef.current > 0);
    }
  }

  async function addVocabulary(rawWords: string) {
    const currentPreferences = preferencesRef.current;
    const nextWords = mergeVocabulary(currentPreferences.words, rawWords);
    if (nextWords.length === currentPreferences.words.length) {
      setVocabularyInput("");
      return;
    }

    await savePreferences({ ...currentPreferences, words: nextWords });
    setVocabularyInput("");
  }

  async function removeVocabulary(word: string) {
    const currentPreferences = preferencesRef.current;
    await savePreferences({
      ...currentPreferences,
      words: currentPreferences.words.filter((savedWord) => savedWord !== word),
    });
  }

  return (
    <WorkspaceInspector
      contentClassName="sm:w-[min(46rem,92vw)] min-[72rem]:w-full"
      onOpenChange={onOpenChange}
      open={open}
    >
      <DrawerHeader>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          <Sparkles aria-hidden="true" className="size-3.5" />
          Local analysis
        </div>
        <DrawerTitle className="mt-2">Spell check</DrawerTitle>
        <DrawerDescription>
          Harper checks this Markdown chapter on your device. Your manuscript is never uploaded.
        </DrawerDescription>
      </DrawerHeader>

      <DrawerBody className="@container px-4 py-5 sm:px-6">
        <section
          aria-labelledby="proofreading-language-title"
          aria-busy={savingPreferences}
          className="mb-5 rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
              <Languages aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold" id="proofreading-language-title">
                Language and book vocabulary
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Choose an English dialect and teach Harper names or Bengali transliterations used in
                this book.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 @min-[34rem]:grid-cols-[12rem_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="proofreading-dialect">English dialect</Label>
              <ProofreadingDialectSelect
                id="proofreading-dialect"
                onChange={(dialect) =>
                  void savePreferences({
                    ...preferencesRef.current,
                    dialect,
                  })
                }
                value={localPreferences.dialect}
              />
            </div>

            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                void addVocabulary(vocabularyInput);
              }}
            >
              <Label htmlFor="proofreading-vocabulary">Add to book dictionary</Label>
              <div className="flex gap-2">
                <Input
                  id="proofreading-vocabulary"
                  onChange={(event) => setVocabularyInput(event.target.value)}
                  placeholder="adda, boudi, pujo"
                  value={vocabularyInput}
                />
                <Button
                  aria-label="Add words to book dictionary"
                  disabled={!vocabularyInput.trim()}
                  size="icon"
                  type="submit"
                >
                  <Plus aria-hidden="true" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Separate multiple words with commas or spaces.
              </p>
            </form>
          </div>

          {localPreferences.words.length > 0 ? (
            <ul aria-label="Book dictionary" className="mt-4 flex flex-wrap gap-2">
              {localPreferences.words.map((word) => (
                <li
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted py-1 pr-1 pl-2.5 text-xs"
                  key={word}
                >
                  <span>{word}</span>
                  <button
                    aria-label={`Remove ${word} from book dictionary`}
                    className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                    onClick={() => void removeVocabulary(word)}
                    type="button"
                  >
                    <X aria-hidden="true" className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {status === "ready" && issues.length > 0 ? (
              categoryCounts.map(([category, count]) => (
                <Badge key={category} variant="secondary">
                  {category} {count}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Chapter source · Markdown</span>
            )}
          </div>
          <Button
            disabled={status === "loading"}
            onClick={() => void runCheck(draft)}
            size="sm"
            variant="outline"
          >
            <RefreshCw aria-hidden="true" className={status === "loading" ? "animate-spin" : ""} />
            Recheck
          </Button>
        </div>

        {error ? (
          <div
            className="mb-4 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {status === "loading" ? <ProofreadingLoading /> : null}
        {status === "stale" ? (
          <EmptyState
            description="The chapter changed after this check. Recheck to refresh issue locations and suggestions."
            title="Results are out of date"
          />
        ) : null}
        {status === "error" && !error ? (
          <EmptyState
            description="The local proofreader could not initialize. You can retry without losing your draft."
            title="Proofreader unavailable"
          />
        ) : null}
        {status === "ready" && issues.length === 0 ? (
          <EmptyState
            description="Harper did not find spelling, grammar, or style issues in this chapter."
            title="No issues found"
          />
        ) : null}

        {status === "ready" && issues.length > 0 ? (
          <ol className="space-y-3" aria-label={`${issues.length} proofreading issues`}>
            {issues.map((issue) => {
              const isPending = pendingIssueId === issue.id;
              return (
                <li className="rounded-2xl border border-border bg-card p-4" key={issue.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Badge variant="outline">{issue.categoryLabel}</Badge>
                      <p className="mt-2 text-sm leading-6 text-foreground">{issue.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {issue.range.start + 1}–{issue.range.end}
                    </span>
                  </div>
                  {issue.problemText ? (
                    <code className="mt-3 block overflow-x-auto rounded-xl bg-muted px-3 py-2 text-sm text-foreground">
                      {issue.problemText}
                    </code>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {issue.suggestions.map((suggestion) => (
                      <Button
                        disabled={isPending}
                        key={suggestion.id}
                        onClick={() => void applySuggestion(issue, suggestion.id)}
                        size="sm"
                      >
                        <Check aria-hidden="true" />
                        {suggestion.kind === "remove"
                          ? "Remove"
                          : suggestion.replacement || "Apply suggestion"}
                      </Button>
                    ))}
                    <Button
                      disabled={isPending}
                      onClick={() => void ignoreIssue(issue.id)}
                      size="sm"
                      variant="ghost"
                    >
                      Ignore
                    </Button>
                    {issue.category === "spelling" && issue.problemText ? (
                      <Button
                        disabled={isPending}
                        onClick={() => void addVocabulary(issue.problemText)}
                        size="sm"
                        variant="outline"
                      >
                        <Plus aria-hidden="true" />
                        Add to dictionary
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : null}
      </DrawerBody>

      <p aria-live="polite" className="sr-only">
        {status === "loading"
          ? "Checking chapter"
          : status === "ready"
            ? `${issues.length} issues found`
            : status === "stale"
              ? "Proofreading results are out of date"
              : ""}
      </p>
    </WorkspaceInspector>
  );
}

function ProofreadingLoading() {
  return (
    <output aria-label="Checking chapter" className="block space-y-3">
      {[0, 1, 2].map((item) => (
        <div
          className="h-28 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none"
          key={item}
        />
      ))}
    </output>
  );
}

function EmptyState({ description, title }: { description: string; title: string }) {
  return (
    <section className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-border p-6 text-center">
      <div className="max-w-sm">
        <Check aria-hidden="true" className="mx-auto mb-3 size-6 text-primary" />
        <h3 className="font-heading text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}

function mergeVocabulary(currentWords: readonly string[], rawWords: string): string[] {
  const nextWords = [...currentWords];
  const normalizedWords = new Set(currentWords.map((word) => word.toLocaleLowerCase()));

  for (const word of rawWords.split(/[\s,]+/u)) {
    const trimmed = word.trim();
    const normalized = trimmed.toLocaleLowerCase();
    if (trimmed && !normalizedWords.has(normalized)) {
      normalizedWords.add(normalized);
      nextWords.push(trimmed);
    }
  }

  return nextWords;
}
