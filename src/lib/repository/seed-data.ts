import { countManuscript } from "../markdown";
import type { AwthorRepository, RepositoryData } from "./contract";
import {
  appSettingsSchema,
  bookSchema,
  type Chapter,
  type ChapterArc,
  chapterSchema,
  characterSchema,
} from "./models";

const seededAt = "2026-08-28T09:30:00.000Z";
const millisecondsPerDay = 24 * 60 * 60 * 1000;

type SeedChapter = Pick<Chapter, "id" | "number" | "title" | "body" | "arc"> &
  Partial<Pick<Chapter, "summary" | "status" | "pov">>;

const missingPageChapterSeeds = [
  {
    id: "missing-page-chapter-1",
    number: 1,
    title: "The Brass Key",
    body: `# The Brass Key

Elara found the key in a drawer the house plans said did not exist.

It was warm despite the winter air, its bow worn smooth by a hand she almost remembered. On the tag, someone had written **ROOM 3** in her mentor's narrow script.

> Every locked room is a promise, he used to say. The question is who made it.

She pocketed the key before the caretaker returned.`,
    arc: {
      stage: "Setup",
      tension: 2,
      goal: "Introduce the impossible key and Elara's reason for staying.",
      conflict: "Elara must conceal the discovery from the caretaker.",
      outcome: "She keeps the key and commits to searching the house.",
    } satisfies ChapterArc,
  },
  {
    id: "missing-page-chapter-2",
    number: 2,
    title: "A Floorplan in Ink",
    body: `# A Floorplan in Ink

By morning, a new corridor had appeared on the floorplan.

- It began behind the library wall.
- It ended in a room without a number.
- The ink was still wet.

Elara compared it with yesterday's photograph. The corridor was not there, but the faint outline of a door was.`,
    arc: {
      stage: "Rising action",
      tension: 3,
      goal: "Prove the house is changing rather than merely hidden.",
      conflict: "The evidence changes every time Elara documents it.",
      outcome: "A photograph preserves one contradiction.",
    } satisfies ChapterArc,
  },
  {
    id: "missing-page-chapter-3",
    number: 3,
    title: "The Room Without a Door",
    body: `# The Room Without a Door

The hallway ended where the floorplan insisted it shouldn't. No door, no archway—just wallpaper fading at the seams, and a silence that felt rehearsed.

Behind it, something breathed.

Elara closed her eyes and listened. The house wasn't empty. It was waiting.

Waiting for someone to ask the right question—or open the wrong door.`,
    arc: {
      stage: "Midpoint",
      tension: 4,
      goal: "Reach the hidden room.",
      conflict: "There is no physical entrance and something is awake behind the wall.",
      outcome: "Elara decides to use the brass key despite the risk.",
    } satisfies ChapterArc,
  },
] satisfies readonly SeedChapter[];

const saltLinesChapterSeeds = [
  {
    id: "salt-lines-chapter-1",
    number: 1,
    title: "The Tide Ledger",
    body: `# The Tide Ledger

Mara Sen returned to Aster Bay with one suitcase and a ledger swollen by salt.

Every page carried two columns: the tide the harbour master had predicted, and the tide that had actually arrived. For forty-two years the difference was measured in centimetres. On the final page, her father's handwriting changed.

> Do not trust the moon after the siren.

At noon, the sea withdrew beyond the lighthouse and exposed a road no map remembered.`,
    summary: "Mara inherits a tidal record that predicts an impossible event in her hometown.",
    status: "Complete",
    pov: "Mara Sen",
    arc: {
      stage: "Setup",
      tension: 2,
      goal: "Bring Mara home and establish the ledger's impossible prediction.",
      conflict: "The town dismisses her father's final warning as grief and superstition.",
      outcome: "The retreating sea reveals physical proof that the ledger is accurate.",
    } satisfies ChapterArc,
  },
  {
    id: "salt-lines-chapter-2",
    number: 2,
    title: "The Road Below Water",
    body: `# The Road Below Water

The road was paved with black stones polished flat by centuries of current.

Mara and her brother Ivo followed it past the stranded fishing boats. Their phones showed no signal, but every radio in the harbour repeated the same three notes.

Halfway to the horizon they found a milestone engraved with tomorrow's date.

Ivo wanted to turn back. Mara photographed the stone, opened the ledger, and saw that a new line had appeared beneath her father's last entry.`,
    summary: "The siblings follow the exposed road and discover that the ledger is still changing.",
    status: "Revision",
    pov: "Mara Sen",
    arc: {
      stage: "Rising action",
      tension: 3,
      goal: "Discover where the exposed road leads before the tide returns.",
      conflict:
        "Mara's evidence changes while Ivo fears they are repeating their father's mistake.",
      outcome: "A dated milestone and a fresh ledger entry tie tomorrow's disaster to the road.",
    } satisfies ChapterArc,
  },
  {
    id: "salt-lines-chapter-3",
    number: 3,
    title: "When the Siren Sings",
    body: `# When the Siren Sings

The lighthouse siren sounded at dusk, although its cables had been cut before Mara was born.

The first note stopped the gulls. The second raised a silver line across the horizon. At the third, the moon's reflection split into two paths—one leading home, the other toward a town standing beneath the sea.

Mara understood the ledger at last. It had never predicted the tides. It recorded choices.

She wrote their names in the empty column and chose the road that would still exist at dawn.`,
    summary:
      "Mara learns what the ledger measures and makes the story's first irreversible choice.",
    status: "Draft",
    pov: "Mara Sen",
    arc: {
      stage: "Midpoint",
      tension: 5,
      goal: "Survive the returning tide and interpret the ledger before the siren ends.",
      conflict: "Saving Aster Bay appears to require abandoning the submerged town and its people.",
      outcome: "Mara chooses a path, changing both the ledger and the coastline.",
    } satisfies ChapterArc,
  },
] satisfies readonly SeedChapter[];

export const seedRepositoryBookIds = ["the-missing-page", "salt-lines"] as const;

export function hasSeedRepositoryData(data: RepositoryData): boolean {
  const bookIds = new Set(data.books.map((book) => book.id));
  return seedRepositoryBookIds.some((bookId) => bookIds.has(bookId));
}

export async function unseedRepositoryData(repository: AwthorRepository): Promise<number> {
  const data = await repository.getData();
  const seedBookIds = new Set<string>(seedRepositoryBookIds);
  const seededBooks = data.books.filter((book) => seedBookIds.has(book.id));

  if (seededBooks.length === 0) {
    return 0;
  }

  const hasOnlySeedBooks = seededBooks.length === data.books.length;
  const hasOriginalSeedProfile =
    data.profile?.authorName === "Alex Parker" &&
    data.profile.contactEmail === "alex.parker@example.com" &&
    data.profile.website === "https://alexparker.example";

  if (hasOnlySeedBooks && hasOriginalSeedProfile) {
    await repository.clearAll();
    return seededBooks.length;
  }

  for (const book of seededBooks) {
    await repository.deleteBook(book.id);
  }
  return seededBooks.length;
}

function createSeedChapters(
  seeds: readonly SeedChapter[],
  defaultPov: string,
  now: string,
): Chapter[] {
  return seeds.map((seed, index) => {
    const counts = countManuscript(seed.body);
    return chapterSchema.parse({
      ...seed,
      summary: seed.summary ?? seed.arc.outcome,
      status: seed.status ?? (index === seeds.length - 1 ? "Draft" : "Complete"),
      ...counts,
      pov: seed.pov ?? defaultPov,
      createdAt: now,
      updatedAt: now,
    });
  });
}

function bookCounts(chapters: readonly Chapter[]) {
  const wordCount = chapters.reduce((total, chapter) => total + chapter.wordCount, 0);
  return {
    chapterCount: chapters.length,
    pageCount: Math.ceil(wordCount / 250),
    wordCount,
    characterCount: chapters.reduce((total, chapter) => total + chapter.characterCount, 0),
    characterCountWithSpaces: chapters.reduce(
      (total, chapter) => total + chapter.characterCountWithSpaces,
      0,
    ),
  };
}

export function createSeedRepositoryData(now = seededAt): RepositoryData {
  const missingPageChapters = createSeedChapters(missingPageChapterSeeds, "Elara Voss", now);
  const saltLinesChapters = createSeedChapters(saltLinesChapterSeeds, "Mara Sen", now);
  const parsedNow = Date.parse(now);
  const lastBackupReminderShownAt = Number.isFinite(parsedNow)
    ? new Date(parsedNow - 8 * millisecondsPerDay).toISOString()
    : null;
  const missingPage = bookSchema.parse({
    id: "the-missing-page",
    slug: "the-missing-page",
    title: "The Missing Page",
    author: "Alex Parker",
    coverUrl:
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=800&q=80",
    subtitle: "Some rooms exist only after you begin looking for them.",
    status: "First draft",
    genre: "Mystery",
    subgenre: "Gothic mystery",
    language: "English",
    ...bookCounts(missingPageChapters),
    preface: "For everyone who has stopped in front of an ordinary wall and listened.",
    synopsis: "An archivist investigates a house whose floorplan rewrites itself overnight.",
    isPartOfSeries: true,
    seriesName: "The Calder House Files",
    seriesPosition: 1,
    createdAt: now,
    updatedAt: now,
  });
  const saltLines = bookSchema.parse({
    id: "salt-lines",
    slug: "salt-lines",
    title: "Salt Lines",
    author: "Alex Parker",
    coverUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    subtitle: "The sea remembers every road it has taken.",
    status: "Revision",
    genre: "Speculative fiction",
    subgenre: "Climate mystery",
    language: "English",
    ...bookCounts(saltLinesChapters),
    preface: "For coastal towns, inherited warnings, and the maps we redraw together.",
    synopsis:
      "A marine cartographer follows her late father's impossible tide ledger toward a town hidden beneath Aster Bay.",
    isPartOfSeries: false,
    seriesName: "",
    seriesPosition: null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    profile: {
      authorName: "Alex Parker",
      contactEmail: "alex.parker@example.com",
      defaultProofreadingDialect: "american",
      website: "https://alexparker.example",
      theme: "paper",
    },
    theme: "paper",
    books: [missingPage, saltLines],
    settings: appSettingsSchema.parse({
      activeBookId: missingPage.id,
      lastChapterByBook: {
        [missingPage.id]: missingPageChapters.at(-1)?.id,
        [saltLines.id]: saltLinesChapters[1]?.id,
      },
      readingPositionByBook: {
        [missingPage.id]: 0.38,
        [saltLines.id]: 0.21,
      },
      proofreadingByBook: {
        [missingPage.id]: { dialect: "american", words: ["Calder", "Elara"] },
        [saltLines.id]: { dialect: "british", words: ["Aster", "Mara", "tideline"] },
      },
      editor: {
        layout: "seamless",
        fontFamily: "serif",
        fontSize: 18,
        lineHeight: 1.75,
        focusMode: false,
        spellcheck: true,
      },
      backupReminder: {
        enabled: true,
        frequency: "weekly",
        lastShownAt: lastBackupReminderShownAt,
      },
    }),
    chapters: {
      [missingPage.id]: missingPageChapters,
      [saltLines.id]: saltLinesChapters,
    },
    characters: {
      [missingPage.id]: [
        characterSchema.parse({
          id: "character-elara-voss",
          name: "Elara Voss",
          image: "https://i.pravatar.cc/160?img=47",
          dob: "1992-04-17",
          location: "Calder, Maine",
          language: "English, French",
          physicalDescription: "Tall, dark-haired, and usually carrying an archivist's pencil.",
          mentalDescription: "Methodical under pressure, but willing to trust impossible evidence.",
          characteristics: ["Perceptive", "Guarded", "Persistent"],
          storyRole: "Protagonist",
          relationships: "Former student of Dr. Calder; distrusts the estate caretaker.",
          arc: "Moves from documenting other people's histories to accepting her place in one.",
          hidden: false,
        }),
        characterSchema.parse({
          id: "character-jonah-vale",
          name: "Jonah Vale",
          image: "https://i.pravatar.cc/160?img=12",
          dob: "1984-11-02",
          location: "Calder, Maine",
          language: "English",
          physicalDescription:
            "Broad-shouldered, silver at the temples, with paint under his nails.",
          mentalDescription:
            "Watchful and practical; protects the house by withholding what he knows.",
          characteristics: ["Reserved", "Resourceful", "Loyal"],
          storyRole: "Guardian and reluctant ally",
          relationships: "Caretaker of the Calder estate; initially distrustful of Elara.",
          arc: "Must decide whether guarding the house means preserving its secret or helping Elara expose it.",
          hidden: false,
        }),
      ],
      [saltLines.id]: [
        characterSchema.parse({
          id: "character-mara-sen",
          name: "Mara Sen",
          image: "https://i.pravatar.cc/160?img=32",
          dob: "1990-08-21",
          location: "Aster Bay, Cornwall",
          language: "English, Bengali",
          physicalDescription:
            "Compact, wind-burned, and rarely without a waterproof field notebook.",
          mentalDescription:
            "Evidence-driven and emotionally cautious, with a deep fear of repeating her father's obsession.",
          characteristics: ["Analytical", "Protective", "Restless"],
          storyRole: "Protagonist",
          relationships: "Older sister of Ivo Sen; daughter of the late harbour master Arun Sen.",
          arc: "Learns that choosing an uncertain future requires more courage than accurately mapping the past.",
          hidden: false,
        }),
        characterSchema.parse({
          id: "character-ivo-sen",
          name: "Ivo Sen",
          image: "https://i.pravatar.cc/160?img=11",
          dob: "1995-02-13",
          location: "Aster Bay, Cornwall",
          language: "English, Bengali",
          physicalDescription:
            "Lean, quick-moving, with a faded harbour-rescue jacket and a healed brow scar.",
          mentalDescription:
            "Intuitive and community-minded; masks grief with humour and immediate action.",
          characteristics: ["Warm", "Impulsive", "Brave"],
          storyRole: "Deuteragonist and emotional anchor",
          relationships: "Mara's younger brother and a volunteer with the Aster Bay lifeboat crew.",
          arc: "Moves from resisting the family's mystery to becoming the person who helps Mara choose what to save.",
          hidden: false,
        }),
      ],
    },
  };
}

export const seedRepositorySummary = {
  authors: 1,
  books: seedRepositoryBookIds.length,
  chapters: missingPageChapterSeeds.length + saltLinesChapterSeeds.length,
  characters: 4,
};
