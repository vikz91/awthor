"use client";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  HardDrive,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type Character, getAwthorRepository } from "@/lib/repository";
import { useRepositoryCollection } from "@/lib/repository/use-repository-collection";

type NewCharacter = Pick<
  Character,
  | "name"
  | "dob"
  | "location"
  | "language"
  | "physicalDescription"
  | "mentalDescription"
  | "storyRole"
>;

const initialCharacters: Character[] = [
  {
    id: "eliza-vale",
    name: "Eliza Vale",
    image: "https://i.pravatar.cc/160?img=47",
    dob: "1991-04-18",
    location: "Bellwether, Maine",
    language: "English, conversational French",
    physicalDescription:
      "Tall and wiry, with weather-reddened cheeks, cropped dark curls, and a thin scar through her left eyebrow. Usually wears her father's old navy peacoat.",
    mentalDescription:
      "Hyper-observant and self-reliant. Eliza treats vulnerability as a liability, but her fierce memory makes it difficult for her to leave old grief untouched.",
    characteristics: ["Resourceful", "Guarded", "Dry-witted", "Loyal"],
    storyRole: "Protagonist",
    relationships:
      "Samuel Reed — estranged childhood friend; Mae Bell — aunt and reluctant confidante; Gideon Price — former mentor and present adversary.",
    arc: "Returns home intending to settle the family estate quickly, then learns that belonging is something she can choose rather than inherit. She ends by telling the truth she once fled and staying on her own terms.",
    hidden: false,
  },
  {
    id: "samuel-reed",
    name: "Samuel Reed",
    image: "https://i.pravatar.cc/160?img=12",
    dob: "1989-11-03",
    location: "Bellwether, Maine",
    language: "English, American Sign Language",
    physicalDescription:
      "Broad-shouldered, with close-cropped auburn hair and sea-green eyes. His hands are nicked from years repairing wooden boats at the harbor.",
    mentalDescription:
      "Patient and grounded, though his steadiness hides a deep fear of abandonment. He avoids conflict until silence begins to cost more than honesty.",
    characteristics: ["Patient", "Practical", "Protective", "Stubborn"],
    storyRole: "Deuteragonist",
    relationships:
      "Eliza Vale — childhood friend and unresolved love; Nora Reed — younger sister; Mae Bell — longtime customer and surrogate family.",
    arc: "Stops waiting for Eliza to become the person he remembers. By accepting who she is now, he also chooses a future beyond the life others planned for him.",
    hidden: false,
  },
  {
    id: "mae-bell",
    name: "Mae Bell",
    image: "https://i.pravatar.cc/160?img=44",
    dob: "1958-07-29",
    location: "Bellwether, Maine",
    language: "English, Irish Gaelic",
    physicalDescription:
      "Compact and silver-haired, with bright blue glasses and paint permanently worked into her fingertips. Favors bold scarves and battered work boots.",
    mentalDescription:
      "Warm but unsentimental. Mae understands more than she admits and uses humor to give people room to arrive at difficult truths themselves.",
    characteristics: ["Perceptive", "Mischievous", "Candid", "Generous"],
    storyRole: "Mentor",
    relationships:
      "Eliza Vale — niece; Samuel Reed — neighbor and trusted friend; Gideon Price — former business partner she no longer trusts.",
    arc: "Moves from protecting Eliza through carefully kept secrets to trusting her with the full story, even when disclosure threatens Mae's own reputation.",
    hidden: false,
  },
  {
    id: "nora-reed",
    name: "Nora Reed",
    image: "https://i.pravatar.cc/160?img=32",
    dob: "1997-02-14",
    location: "Portland, Maine",
    language: "English, Spanish",
    physicalDescription:
      "Short, athletic, and expressive, with a cloud of copper curls and a constellation tattoo across her right shoulder.",
    mentalDescription:
      "Quick-thinking and socially fearless. Nora can turn any problem into a plan, but often mistakes momentum for certainty.",
    characteristics: ["Bold", "Inventive", "Restless", "Empathetic"],
    storyRole: "Confidante",
    relationships:
      "Samuel Reed — older brother; Eliza Vale — new friend and occasional foil; Gideon Price — investigative subject.",
    arc: "Learns that helping does not always mean taking control, and becomes the first person to let Eliza set the pace of her own return.",
    hidden: false,
  },
  {
    id: "gideon-price",
    name: "Gideon Price",
    image: "https://i.pravatar.cc/160?img=11",
    dob: "1964-09-06",
    location: "Camden, Maine",
    language: "English, French",
    physicalDescription:
      "Immaculately dressed, with silver at his temples and an old rowing injury that gives him a near-imperceptible limp.",
    mentalDescription:
      "Controlled, persuasive, and skilled at reframing self-interest as duty. His fear of irrelevance drives his need to shape every narrative around him.",
    characteristics: ["Charismatic", "Calculating", "Patient", "Proud"],
    storyRole: "Antagonist",
    relationships:
      "Eliza Vale — former protégé; Mae Bell — former business partner; Samuel Reed — obstacle to his redevelopment plans.",
    arc: "His polished version of the past unravels as Eliza uncovers the cost of his choices. He loses control of the town's story, though not his conviction that he acted correctly.",
    hidden: true,
  },
];

const emptyNewCharacter: NewCharacter = {
  name: "",
  dob: "",
  location: "",
  language: "English",
  physicalDescription: "",
  mentalDescription: "",
  storyRole: "Supporting",
};

const storyRoles = [
  "Protagonist",
  "Deuteragonist",
  "Antagonist",
  "Mentor",
  "Confidante",
  "Supporting",
];

const repository = getAwthorRepository();

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getAge(dob: string) {
  if (!dob) {
    return null;
  }

  const [year, month, day] = dob.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) {
    age -= 1;
  }
  return age;
}

function formatDob(dob: string) {
  if (!dob) {
    return "Date of birth not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${dob}T00:00:00Z`));
}

export function CharacterWorkspace({ bookId, bookTitle }: { bookId: string; bookTitle: string }) {
  const [characters, setCharacters, repositoryState] = useRepositoryCollection(
    repository.characters,
    bookId,
    initialCharacters,
  );
  const [selectedId, setSelectedId] = useState(initialCharacters[0].id);
  const [draft, setDraft] = useState(initialCharacters[0]);
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCharacter, setNewCharacter] = useState(emptyNewCharacter);
  const hydratedBookId = useRef<string | null>(null);

  useEffect(() => {
    if (!repositoryState.isReady || hydratedBookId.current === bookId) {
      return;
    }

    const selected = characters.find((character) => character.id === selectedId) ?? characters[0];
    if (selected) {
      setSelectedId(selected.id);
      setDraft(selected);
    }
    hydratedBookId.current = bookId;
  }, [bookId, characters, repositoryState.isReady, selectedId]);

  const visibleCharacters = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return characters.filter((character) => {
      const matchesVisibility = showHidden || !character.hidden;
      const matchesQuery =
        !normalizedQuery ||
        character.name.toLowerCase().includes(normalizedQuery) ||
        character.storyRole.toLowerCase().includes(normalizedQuery);
      return matchesVisibility && matchesQuery;
    });
  }, [characters, query, showHidden]);

  const selectedCharacter = characters.find((character) => character.id === selectedId);
  const hasUnsavedChanges = selectedCharacter
    ? JSON.stringify(selectedCharacter) !== JSON.stringify(draft)
    : false;
  const hiddenCount = characters.filter((character) => character.hidden).length;
  const navItems = [
    { label: "Overview", href: `/books/${bookId}` },
    { label: "Chapters", href: `/books/${bookId}/chapters` },
    { label: "Characters", href: `/books/${bookId}/characters` },
    { label: "Plots", href: `/books/${bookId}/plots` },
    { label: "Notes", href: `/books/${bookId}/notes` },
  ];

  function selectCharacter(character: Character) {
    setSelectedId(character.id);
    setDraft(character);
  }

  function setDraftField<Key extends keyof Character>(field: Key, value: Character[Key]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function saveDraft() {
    setCharacters((current) =>
      current.map((character) => (character.id === draft.id ? draft : character)),
    );
  }

  function resetDraft() {
    if (selectedCharacter) {
      setDraft(selectedCharacter);
    }
  }

  function toggleHidden(id: string) {
    const currentCharacter = characters.find((character) => character.id === id);
    if (!currentCharacter) {
      return;
    }

    const willBeHidden = !currentCharacter.hidden;
    const updated = characters.map((character) =>
      character.id === id ? { ...character, hidden: willBeHidden } : character,
    );
    setCharacters(updated);

    if (selectedId === id) {
      const updatedCharacter = updated.find((character) => character.id === id);
      if (willBeHidden && !showHidden) {
        const nextCharacter = updated.find((character) => !character.hidden && character.id !== id);
        if (nextCharacter) {
          selectCharacter(nextCharacter);
        }
      } else if (updatedCharacter) {
        setDraft(updatedCharacter);
      }
    }
  }

  function deleteCharacter(id: string) {
    const remaining = characters.filter((character) => character.id !== id);
    setCharacters(remaining);
    if (selectedId === id) {
      const nextCharacter =
        remaining.find((character) => showHidden || !character.hidden) ?? remaining[0];
      if (nextCharacter) {
        selectCharacter(nextCharacter);
      } else {
        setSelectedId("");
      }
    }
  }

  function addCharacter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = newCharacter.name.trim();
    if (!cleanName) {
      return;
    }

    const createdCharacter: Character = {
      ...newCharacter,
      id: `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      image: `https://i.pravatar.cc/160?img=${20 + (characters.length % 40)}`,
      name: cleanName,
      characteristics: ["Undeveloped"],
      relationships: "No relationships mapped yet.",
      arc: "Character arc is ready to be developed.",
      hidden: false,
    };

    setCharacters((current) => [...current, createdCharacter]);
    selectCharacter(createdCharacter);
    setNewCharacter(emptyNewCharacter);
    setIsAddOpen(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-foreground"
            href={`/books/${bookId}`}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">{bookTitle}</span>
            <span className="sm:hidden">Book</span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <HardDrive aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">
              {repositoryState.error ? "Local save unavailable" : "Saved on this device"}
            </span>
            <span className="sm:hidden">{repositoryState.error ? "Save error" : "Local"}</span>
          </div>
        </div>
        <nav
          aria-label="Book sections"
          className="mx-auto max-w-[1500px] overflow-x-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="flex min-w-max gap-6">
            {navItems.map((item) => {
              const active = item.label === "Characters";
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`border-b-2 px-0.5 py-3 text-sm font-bold transition ${
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  href={item.href}
                  key={item.label}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
              <UsersRound aria-hidden="true" className="size-4" />
              Story bible
            </div>
            <h1 className="font-heading text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Characters
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Keep motivations, relationships, and character arcs consistent as the story grows.
            </p>
          </div>

          <Dialog onOpenChange={setIsAddOpen} open={isAddOpen}>
            <DialogTrigger render={<Button className="h-10 rounded-xl px-4" />}>
              <Plus aria-hidden="true" />
              New character
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <form onSubmit={addCharacter}>
                <DialogHeader>
                  <DialogTitle className="text-xl">Add a character</DialogTitle>
                  <DialogDescription>
                    Start with the essentials. You can develop the full profile after adding them.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field label="Name" required>
                    <Input
                      aria-label="Name"
                      autoFocus
                      className="h-10 rounded-xl bg-muted/60"
                      onChange={(event) =>
                        setNewCharacter((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Character name"
                      required
                      value={newCharacter.name}
                    />
                  </Field>
                  <Field label="Story role">
                    <Select
                      onValueChange={(value) =>
                        value && setNewCharacter((current) => ({ ...current, storyRole: value }))
                      }
                      value={newCharacter.storyRole}
                    >
                      <SelectTrigger
                        aria-label="Story role"
                        className="h-10 w-full rounded-xl bg-muted/60"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {storyRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Date of birth">
                    <Input
                      aria-label="Date of birth"
                      className="h-10 rounded-xl bg-muted/60"
                      onChange={(event) =>
                        setNewCharacter((current) => ({ ...current, dob: event.target.value }))
                      }
                      type="date"
                      value={newCharacter.dob}
                    />
                  </Field>
                  <Field label="Location">
                    <Input
                      aria-label="Location"
                      className="h-10 rounded-xl bg-muted/60"
                      onChange={(event) =>
                        setNewCharacter((current) => ({ ...current, location: event.target.value }))
                      }
                      placeholder="City, region"
                      value={newCharacter.location}
                    />
                  </Field>
                  <Field className="sm:col-span-2" label="Language">
                    <Input
                      aria-label="Language"
                      className="h-10 rounded-xl bg-muted/60"
                      onChange={(event) =>
                        setNewCharacter((current) => ({ ...current, language: event.target.value }))
                      }
                      placeholder="English, French..."
                      value={newCharacter.language}
                    />
                  </Field>
                  <Field className="sm:col-span-2" label="Physical description">
                    <Textarea
                      aria-label="Physical description"
                      className="min-h-24 rounded-xl bg-muted/60"
                      onChange={(event) =>
                        setNewCharacter((current) => ({
                          ...current,
                          physicalDescription: event.target.value,
                        }))
                      }
                      placeholder="Appearance, mannerisms, wardrobe..."
                      value={newCharacter.physicalDescription}
                    />
                  </Field>
                  <Field className="sm:col-span-2" label="Mental description">
                    <Textarea
                      aria-label="Mental description"
                      className="min-h-24 rounded-xl bg-muted/60"
                      onChange={(event) =>
                        setNewCharacter((current) => ({
                          ...current,
                          mentalDescription: event.target.value,
                        }))
                      }
                      placeholder="Temperament, fears, desires..."
                      value={newCharacter.mentalDescription}
                    />
                  </Field>
                </div>

                <DialogFooter className="mt-6">
                  <DialogClose render={<Button type="button" variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <Button type="submit">
                    <Plus aria-hidden="true" />
                    Add character
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </section>

        <div className="mt-7 grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="gap-0 rounded-2xl bg-card py-0 ring-border lg:sticky lg:top-5">
            <div className="border-b border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-lg font-semibold">Cast</h2>
                  <p className="mt-0.5 text-xs font-bold text-muted-foreground">
                    {characters.length - hiddenCount} visible · {hiddenCount} hidden
                  </p>
                </div>
                {hiddenCount > 0 && (
                  <Button
                    aria-label={showHidden ? "Hide hidden characters" : "Show hidden characters"}
                    onClick={() => setShowHidden((current) => !current)}
                    size="icon-sm"
                    title={showHidden ? "Hide hidden characters" : "Show hidden characters"}
                    variant="ghost"
                  >
                    {showHidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </Button>
                )}
              </div>
              <div className="relative mt-3">
                <Search
                  aria-hidden="true"
                  className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Label className="sr-only" htmlFor="character-search">
                  Search characters
                </Label>
                <Input
                  className="h-10 rounded-xl bg-muted/60 pr-3 pl-9"
                  id="character-search"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name or role"
                  type="search"
                  value={query}
                />
              </div>
            </div>

            <CardContent className="max-h-[520px] overflow-y-auto p-2">
              {visibleCharacters.length > 0 ? (
                <ul className="space-y-1">
                  {visibleCharacters.map((character) => {
                    const active = character.id === selectedId;
                    const age = getAge(character.dob);
                    return (
                      <li
                        className={`flex items-center gap-1 rounded-xl p-1 transition ${
                          active ? "bg-primary/10" : "hover:bg-muted/60"
                        }`}
                        key={character.id}
                      >
                        <button
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => selectCharacter(character)}
                          type="button"
                        >
                          <Avatar className="size-10">
                            <AvatarImage alt="" src={character.image} />
                            <AvatarFallback>{getInitials(character.name)}</AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-extrabold">
                                {character.name}
                              </span>
                              {character.hidden && (
                                <EyeOff
                                  aria-label="Hidden"
                                  className="size-3.5 text-muted-foreground"
                                />
                              )}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {character.storyRole}
                              {age !== null ? ` · ${age}` : ""}
                            </span>
                          </span>
                        </button>

                        <CharacterActions
                          character={character}
                          onDelete={() => deleteCharacter(character.id)}
                          onToggleHidden={() => toggleHidden(character.id)}
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="px-4 py-12 text-center">
                  <UserRound aria-hidden="true" className="mx-auto size-7 text-muted-foreground" />
                  <p className="mt-3 text-sm font-bold">No characters found</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Try another search or show hidden characters.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedCharacter ? (
            <Card className="rounded-2xl bg-card ring-border">
              <div className="flex flex-col gap-5 border-b border-border px-5 pb-5 sm:flex-row sm:items-center sm:justify-between lg:px-7">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar className="size-16">
                    <AvatarImage alt="" src={draft.image} />
                    <AvatarFallback className="text-base">{getInitials(draft.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-heading text-2xl font-semibold">{draft.name}</h2>
                      {draft.hidden && (
                        <Badge className="gap-1 text-muted-foreground" variant="secondary">
                          <EyeOff aria-hidden="true" /> Hidden
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {draft.storyRole} · {formatDob(draft.dob)}
                      {getAge(draft.dob) !== null ? ` (${getAge(draft.dob)})` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {hasUnsavedChanges && (
                    <span className="text-xs font-bold text-chart-2">Unsaved</span>
                  )}
                  <Button
                    disabled={!hasUnsavedChanges}
                    onClick={resetDraft}
                    size="icon"
                    variant="ghost"
                  >
                    <RotateCcw aria-hidden="true" />
                    <span className="sr-only">Discard changes</span>
                  </Button>
                  <Button
                    className="h-9 rounded-xl"
                    disabled={!hasUnsavedChanges}
                    onClick={saveDraft}
                  >
                    <Save aria-hidden="true" />
                    Save changes
                  </Button>
                  <CharacterActions
                    character={selectedCharacter}
                    onDelete={() => deleteCharacter(selectedCharacter.id)}
                    onToggleHidden={() => toggleHidden(selectedCharacter.id)}
                  />
                </div>
              </div>

              <CardContent className="space-y-8 px-5 lg:px-7">
                <section aria-labelledby="identity-heading">
                  <SectionHeading id="identity-heading" title="Identity" />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Full name">
                      <Input
                        aria-label="Full name"
                        className="h-10 rounded-xl bg-muted/60"
                        onChange={(event) => setDraftField("name", event.target.value)}
                        value={draft.name}
                      />
                    </Field>
                    <Field label="Story role">
                      <Select
                        onValueChange={(value) => value && setDraftField("storyRole", value)}
                        value={draft.storyRole}
                      >
                        <SelectTrigger
                          aria-label="Story role"
                          className="h-10 w-full rounded-xl bg-muted/60"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {storyRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Date of birth">
                      <div className="relative">
                        <Input
                          aria-label="Date of birth"
                          className="h-10 rounded-xl bg-muted/60 pr-20"
                          onChange={(event) => setDraftField("dob", event.target.value)}
                          type="date"
                          value={draft.dob}
                        />
                        {getAge(draft.dob) !== null && (
                          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                            Age {getAge(draft.dob)}
                          </span>
                        )}
                      </div>
                    </Field>
                    <Field label="Location">
                      <Input
                        aria-label="Location"
                        className="h-10 rounded-xl bg-muted/60"
                        onChange={(event) => setDraftField("location", event.target.value)}
                        value={draft.location}
                      />
                    </Field>
                    <Field className="sm:col-span-2" label="Language">
                      <Input
                        aria-label="Language"
                        className="h-10 rounded-xl bg-muted/60"
                        onChange={(event) => setDraftField("language", event.target.value)}
                        value={draft.language}
                      />
                    </Field>
                  </div>
                </section>

                <section aria-labelledby="profile-heading">
                  <SectionHeading id="profile-heading" title="Profile" />
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    <Field label="Physical description">
                      <Textarea
                        aria-label="Physical description"
                        className="min-h-36 rounded-xl bg-muted/60 leading-6"
                        onChange={(event) =>
                          setDraftField("physicalDescription", event.target.value)
                        }
                        value={draft.physicalDescription}
                      />
                    </Field>
                    <Field label="Mental description">
                      <Textarea
                        aria-label="Mental description"
                        className="min-h-36 rounded-xl bg-muted/60 leading-6"
                        onChange={(event) => setDraftField("mentalDescription", event.target.value)}
                        value={draft.mentalDescription}
                      />
                    </Field>
                    <Field className="xl:col-span-2" label="Characteristics">
                      <Input
                        aria-label="Characteristics"
                        className="h-10 rounded-xl bg-muted/60"
                        onChange={(event) =>
                          setDraftField(
                            "characteristics",
                            event.target.value
                              .split(",")
                              .map((value) => value.trim())
                              .filter(Boolean),
                          )
                        }
                        value={draft.characteristics.join(", ")}
                      />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {draft.characteristics.map((characteristic) => (
                          <Badge
                            className="bg-primary/10 text-primary"
                            key={characteristic}
                            variant="secondary"
                          >
                            {characteristic}
                          </Badge>
                        ))}
                      </div>
                    </Field>
                  </div>
                </section>

                <section aria-labelledby="story-heading">
                  <SectionHeading id="story-heading" title="Story development" />
                  <div className="mt-4 grid gap-4">
                    <Field label="Relationships with other characters">
                      <Textarea
                        aria-label="Relationships with other characters"
                        className="min-h-28 rounded-xl bg-muted/60 leading-6"
                        onChange={(event) => setDraftField("relationships", event.target.value)}
                        value={draft.relationships}
                      />
                    </Field>
                    <Field label="Character arc">
                      <Textarea
                        aria-label="Character arc"
                        className="min-h-32 rounded-xl bg-muted/60 leading-6"
                        onChange={(event) => setDraftField("arc", event.target.value)}
                        value={draft.arc}
                      />
                    </Field>
                  </div>
                </section>
              </CardContent>
            </Card>
          ) : (
            <Card className="items-center justify-center rounded-2xl bg-card py-24 text-center ring-border">
              <UserRound aria-hidden="true" className="size-9 text-muted-foreground" />
              <div>
                <h2 className="font-heading text-xl font-semibold">Your cast is empty</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a character to start building your story bible.
                </p>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function CharacterActions({
  character,
  onDelete,
  onToggleHidden,
}: {
  character: Character;
  onDelete: () => void;
  onToggleHidden: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Actions for ${character.name}`}
            className="shrink-0"
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem onClick={onToggleHidden}>
          {character.hidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
          {character.hidden ? "Show character" : "Hide character"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} variant="destructive">
          <Trash2 aria-hidden="true" />
          Delete character
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Field({
  children,
  className = "",
  label,
  required = false,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <h3 className="font-heading text-lg font-semibold" id={id}>
        {title}
      </h3>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
