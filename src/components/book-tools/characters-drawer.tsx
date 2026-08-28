"use client";

import { Eye, EyeOff, LoaderCircle, Plus, Save, Search, Trash2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeRemoteImageUrl } from "@/lib/markdown";
import { type Character, getAwthorRepository } from "@/lib/repository";
import { cn } from "@/lib/utils";

type CharactersDrawerProps = {
  bookId: string;
  open: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onOpenChange: (open: boolean) => void;
};

type LoadStatus = "idle" | "loading" | "ready" | "error";

const repository = getAwthorRepository();

export function CharactersDrawer({
  bookId,
  onDirtyChange,
  onOpenChange,
  open,
}: CharactersDrawerProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState<Character | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [saveLabel, setSaveLabel] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [status, setStatus] = useState<LoadStatus>("idle");

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    setStatus("loading");
    setError(null);
    void (async () => {
      try {
        const initialization = await repository.initialize();
        if (initialization.status === "failed") {
          throw initialization.error;
        }
        const storedCharacters = (await repository.characters.list(bookId)) ?? [];
        if (!active) {
          return;
        }
        setCharacters(storedCharacters);
        setDraft(
          (current) =>
            storedCharacters.find((character) => character.id === current?.id) ??
            storedCharacters.find((character) => !character.hidden) ??
            storedCharacters[0] ??
            null,
        );
        setStatus("ready");
      } catch (caughtError) {
        if (!active) {
          return;
        }
        setError(toErrorMessage(caughtError, "Characters could not be loaded from this device."));
        setStatus("error");
      }
    })();

    return () => {
      active = false;
    };
  }, [bookId, open]);

  const filteredCharacters = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return characters.filter((character) => {
      const isVisible = showHidden || !character.hidden;
      const matches =
        !normalizedQuery ||
        character.name.toLowerCase().includes(normalizedQuery) ||
        character.storyRole.toLowerCase().includes(normalizedQuery) ||
        character.location.toLowerCase().includes(normalizedQuery);
      return isVisible && matches;
    });
  }, [characters, query, showHidden]);

  const selected = draft
    ? (characters.find((character) => character.id === draft.id) ?? null)
    : null;
  const isDirty = Boolean(selected && draft && JSON.stringify(selected) !== JSON.stringify(draft));
  const hiddenCount = characters.filter((character) => character.hidden).length;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  function canDiscardDraft() {
    return (
      !isDirty || window.confirm("Discard the unsaved changes to this character and continue?")
    );
  }

  function requestOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
  }

  function updateDraft<Key extends keyof Character>(field: Key, value: Character[Key]) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
    setSaveLabel("");
    setConfirmDelete(false);
  }

  async function createCharacter() {
    if (!canDiscardDraft()) {
      return;
    }

    setError(null);
    setSaveLabel("Creating character…");
    try {
      const created = await repository.createCharacter(bookId, {
        name: "New character",
        storyRole: "Supporting",
      });
      setCharacters((current) => [...current, created]);
      setDraft(created);
      setSaveLabel("New character ready to edit");
    } catch (caughtError) {
      setError(toErrorMessage(caughtError, "The character could not be created."));
      setSaveLabel("");
    }
  }

  async function saveCharacter() {
    if (!draft) {
      return;
    }

    setError(null);
    setSaveLabel("Saving…");
    try {
      const { id, ...changes } = draft;
      const updated = await repository.updateCharacter(bookId, id, changes);
      setCharacters((current) =>
        current.map((character) => (character.id === updated.id ? updated : character)),
      );
      setDraft(updated);
      setSaveLabel("Saved on this device");
    } catch (caughtError) {
      setError(toErrorMessage(caughtError, "The character could not be saved."));
      setSaveLabel("Save failed");
    }
  }

  async function toggleHidden(character: Character) {
    setError(null);
    try {
      const updated = await repository.updateCharacter(bookId, character.id, {
        hidden: !character.hidden,
      });
      setCharacters((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (draft?.id === updated.id) {
        setDraft(updated);
      }
    } catch (caughtError) {
      setError(toErrorMessage(caughtError, "Character visibility could not be changed."));
    }
  }

  async function deleteCharacter() {
    if (!draft) {
      return;
    }

    setError(null);
    try {
      await repository.deleteCharacter(bookId, draft.id);
      const remaining = characters.filter((character) => character.id !== draft.id);
      setCharacters(remaining);
      setDraft(
        remaining.find((character) => showHidden || !character.hidden) ?? remaining[0] ?? null,
      );
      setConfirmDelete(false);
      setSaveLabel("Character deleted");
    } catch (caughtError) {
      setError(toErrorMessage(caughtError, "The character could not be deleted."));
    }
  }

  return (
    <Drawer onOpenChange={requestOpenChange} open={open}>
      <DrawerContent>
        <DrawerHeader className="flex-row items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              <UserRound aria-hidden="true" className="size-3.5" />
              Story bible
            </div>
            <DrawerTitle className="mt-2">Characters</DrawerTitle>
            <DrawerDescription>
              Keep each character’s role, relationships, and arc beside the manuscript.
            </DrawerDescription>
          </div>
          <Button className="mr-8 shrink-0" onClick={() => void createCharacter()} size="sm">
            <Plus aria-hidden="true" />
            New
          </Button>
        </DrawerHeader>

        <DrawerBody className="flex flex-col overflow-hidden md:grid md:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="flex max-h-[42dvh] min-h-0 flex-col border-b border-border bg-muted/20 md:max-h-none md:border-r md:border-b-0">
            <div className="space-y-3 border-b border-border p-3">
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-label="Search characters"
                  className="h-10 bg-background pl-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, role, location…"
                  type="search"
                  value={query}
                />
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>Show hidden</span>
                <span className="flex items-center gap-2">
                  {hiddenCount > 0 ? <Badge variant="secondary">{hiddenCount}</Badge> : null}
                  <input
                    checked={showHidden}
                    className="size-4 accent-primary"
                    onChange={(event) => setShowHidden(event.target.checked)}
                    type="checkbox"
                  />
                </span>
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {status === "loading" ? (
                <output className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                  Loading characters…
                </output>
              ) : null}
              {status === "ready" && filteredCharacters.length === 0 ? (
                <p className="p-4 text-sm leading-6 text-muted-foreground">
                  {characters.length === 0
                    ? "No characters yet. Create one to start the story bible."
                    : "No characters match this view."}
                </p>
              ) : null}
              <ul className="space-y-1" aria-label="Characters">
                {filteredCharacters.map((character) => (
                  <li key={character.id}>
                    <button
                      aria-current={draft?.id === character.id ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        draft?.id === character.id ? "bg-accent" : "hover:bg-muted",
                      )}
                      onClick={() => {
                        if (!canDiscardDraft()) {
                          return;
                        }
                        setDraft(character);
                        setConfirmDelete(false);
                        setSaveLabel("");
                      }}
                      type="button"
                    >
                      <CharacterAvatar bookId={bookId} character={character} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {character.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {character.storyRole || "Role not set"}
                        </span>
                      </span>
                      {character.hidden ? (
                        <EyeOff aria-label="Hidden" className="size-3.5 text-muted-foreground" />
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <section
            className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"
            aria-label="Character dossier"
          >
            {error ? (
              <div
                className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
              >
                {error}
              </div>
            ) : null}
            {status === "error" ? (
              <section className="grid min-h-72 place-items-center text-center">
                <div className="max-w-sm">
                  <h3 className="font-heading text-lg font-semibold">Characters unavailable</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Check that browser storage is available, then close and reopen this tool.
                  </p>
                </div>
              </section>
            ) : null}
            {status === "ready" && !draft ? (
              <section className="grid min-h-72 place-items-center text-center">
                <div className="max-w-sm">
                  <UserRound aria-hidden="true" className="mx-auto mb-3 size-7 text-primary" />
                  <h3 className="font-heading text-lg font-semibold">
                    Create your first character
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Add a character, then develop their full dossier here.
                  </p>
                  <Button className="mt-4" onClick={() => void createCharacter()}>
                    <Plus aria-hidden="true" />
                    New character
                  </Button>
                </div>
              </section>
            ) : null}
            {draft ? (
              <CharacterDossier
                bookId={bookId}
                character={draft}
                confirmDelete={confirmDelete}
                isDirty={isDirty}
                onCancelDelete={() => setConfirmDelete(false)}
                onConfirmDelete={() => void deleteCharacter()}
                onRequestDelete={() => setConfirmDelete(true)}
                onSave={() => void saveCharacter()}
                onToggleHidden={() => void toggleHidden(draft)}
                onUpdate={updateDraft}
                saveLabel={saveLabel}
              />
            ) : null}
          </section>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

type CharacterDossierProps = {
  bookId: string;
  character: Character;
  confirmDelete: boolean;
  isDirty: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onRequestDelete: () => void;
  onSave: () => void;
  onToggleHidden: () => void;
  onUpdate: <Key extends keyof Character>(field: Key, value: Character[Key]) => void;
  saveLabel: string;
};

function CharacterDossier({
  bookId,
  character,
  confirmDelete,
  isDirty,
  onCancelDelete,
  onConfirmDelete,
  onRequestDelete,
  onSave,
  onToggleHidden,
  onUpdate,
  saveLabel,
}: CharacterDossierProps) {
  const prefix = `character-${character.id}`;
  const age = getAge(character.dob);

  return (
    <form
      className="mx-auto max-w-3xl space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
        <CharacterAvatar bookId={bookId} character={character} large />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {character.hidden ? "Hidden character" : "Character dossier"}
          </p>
          <h3 className="mt-1 truncate font-heading text-2xl font-semibold">{character.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {character.dob
              ? `${formatDob(character.dob)}${age === null ? "" : ` · age ${age}`}`
              : "Date of birth not set"}
          </p>
        </div>
        <Button
          disabled={isDirty}
          onClick={onToggleHidden}
          title={isDirty ? "Save changes before changing visibility" : undefined}
          type="button"
          variant="outline"
        >
          {character.hidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
          {character.hidden ? "Show" : "Hide"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor={`${prefix}-name`} label="Name">
          <Input
            id={`${prefix}-name`}
            onChange={(event) => onUpdate("name", event.target.value)}
            required
            value={character.name}
          />
        </Field>
        <Field htmlFor={`${prefix}-image`} label="Image URL">
          <Input
            id={`${prefix}-image`}
            inputMode="url"
            onChange={(event) => onUpdate("image", event.target.value)}
            placeholder="Optional; a local default is generated"
            type="url"
            value={character.image}
          />
        </Field>
        <Field htmlFor={`${prefix}-dob`} label="Date of birth">
          <Input
            id={`${prefix}-dob`}
            onChange={(event) => onUpdate("dob", event.target.value)}
            type="date"
            value={character.dob}
          />
        </Field>
        <Field htmlFor={`${prefix}-role`} label="Story role">
          <Input
            id={`${prefix}-role`}
            onChange={(event) => onUpdate("storyRole", event.target.value)}
            placeholder="Protagonist, mentor, antagonist…"
            value={character.storyRole}
          />
        </Field>
        <Field htmlFor={`${prefix}-location`} label="Location">
          <Input
            id={`${prefix}-location`}
            onChange={(event) => onUpdate("location", event.target.value)}
            value={character.location}
          />
        </Field>
        <Field htmlFor={`${prefix}-language`} label="Language">
          <Input
            id={`${prefix}-language`}
            onChange={(event) => onUpdate("language", event.target.value)}
            value={character.language}
          />
        </Field>
      </div>

      <Field htmlFor={`${prefix}-characteristics`} label="Characteristics">
        <Input
          id={`${prefix}-characteristics`}
          onChange={(event) =>
            onUpdate(
              "characteristics",
              event.target.value
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            )
          }
          placeholder="Observant, guarded, loyal"
          value={character.characteristics.join(", ")}
        />
      </Field>
      <Field htmlFor={`${prefix}-physical`} label="Physical description">
        <Textarea
          id={`${prefix}-physical`}
          onChange={(event) => onUpdate("physicalDescription", event.target.value)}
          rows={4}
          value={character.physicalDescription}
        />
      </Field>
      <Field htmlFor={`${prefix}-mental`} label="Mental description">
        <Textarea
          id={`${prefix}-mental`}
          onChange={(event) => onUpdate("mentalDescription", event.target.value)}
          rows={4}
          value={character.mentalDescription}
        />
      </Field>
      <Field htmlFor={`${prefix}-relationships`} label="Relationships with other characters">
        <Textarea
          id={`${prefix}-relationships`}
          onChange={(event) => onUpdate("relationships", event.target.value)}
          rows={4}
          value={character.relationships}
        />
      </Field>
      <Field htmlFor={`${prefix}-arc`} label="Character arc">
        <Textarea
          id={`${prefix}-arc`}
          onChange={(event) => onUpdate("arc", event.target.value)}
          rows={5}
          value={character.arc}
        />
      </Field>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-popover/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-3">
        <div aria-live="polite" className="text-xs text-muted-foreground">
          {isDirty ? "Unsaved changes" : saveLabel || "Saved locally"}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {confirmDelete ? (
            <>
              <span className="text-xs font-medium text-destructive">Delete permanently?</span>
              <Button onClick={onCancelDelete} size="sm" type="button" variant="ghost">
                Cancel
              </Button>
              <Button onClick={onConfirmDelete} size="sm" type="button" variant="destructive">
                Delete
              </Button>
            </>
          ) : (
            <Button onClick={onRequestDelete} size="sm" type="button" variant="ghost">
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
          )}
          <Button disabled={!isDirty} size="sm" type="submit">
            <Save aria-hidden="true" />
            Save character
          </Button>
        </div>
      </div>
    </form>
  );
}

function CharacterAvatar({
  bookId,
  character,
  large = false,
}: {
  bookId: string;
  character: Character;
  large?: boolean;
}) {
  const source =
    sanitizeRemoteImageUrl(character.image) ?? deterministicPravatar(bookId, character.id);
  return (
    <Avatar className={large ? "size-16" : "size-10"} size="lg">
      <AvatarImage alt="" loading="lazy" referrerPolicy="no-referrer" src={source} />
      <AvatarFallback>{initials(character.name)}</AvatarFallback>
    </Avatar>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function deterministicPravatar(bookId: string, characterId: string) {
  const seed = `${bookId}:${characterId}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return `https://i.pravatar.cc/160?img=${(hash % 70) + 1}`;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getAge(dob: string): number | null {
  const birthDate = new Date(`${dob}T00:00:00Z`);
  if (!dob || Number.isNaN(birthDate.getTime())) {
    return null;
  }
  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < birthDate.getUTCMonth() ||
    (today.getUTCMonth() === birthDate.getUTCMonth() &&
      today.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthday) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function formatDob(dob: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${dob}T00:00:00Z`));
}

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
