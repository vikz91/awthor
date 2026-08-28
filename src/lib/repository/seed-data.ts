import { countManuscript } from "../markdown";
import type { RepositoryData } from "./contract";
import {
  appSettingsSchema,
  bookSchema,
  type ChapterArc,
  chapterSchema,
  characterSchema,
} from "./models";

const seededAt = "2026-08-28T09:30:00.000Z";

const chapterSeeds = [
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
];

export function createSeedRepositoryData(now = seededAt): RepositoryData {
  const chapters = chapterSeeds.map((seed) => {
    const counts = countManuscript(seed.body);
    return chapterSchema.parse({
      ...seed,
      summary: seed.arc.outcome,
      status: seed.number === chapterSeeds.length ? "Draft" : "Complete",
      ...counts,
      pov: "Elara Voss",
      createdAt: now,
      updatedAt: now,
    });
  });
  const wordCount = chapters.reduce((total, chapter) => total + chapter.wordCount, 0);
  const book = bookSchema.parse({
    id: "the-missing-page",
    slug: "the-missing-page",
    title: "The Missing Page",
    author: "Alex Parker",
    coverUrl: null,
    subtitle: "Some rooms exist only after you begin looking for them.",
    status: "First draft",
    genre: "Mystery",
    subgenre: "Gothic mystery",
    language: "English",
    chapterCount: chapters.length,
    pageCount: Math.ceil(wordCount / 250),
    wordCount,
    characterCount: chapters.reduce((total, chapter) => total + chapter.characterCount, 0),
    characterCountWithSpaces: chapters.reduce(
      (total, chapter) => total + chapter.characterCountWithSpaces,
      0,
    ),
    preface: "For everyone who has stopped in front of an ordinary wall and listened.",
    synopsis: "An archivist investigates a house whose floorplan rewrites itself overnight.",
    isPartOfSeries: true,
    seriesName: "The Calder House Files",
    seriesPosition: 1,
    createdAt: now,
    updatedAt: now,
  });

  return {
    profile: {
      authorName: "Alex Parker",
      contactEmail: "alex.parker@example.com",
      website: "https://alexparker.example",
      theme: "paper",
    },
    theme: "paper",
    books: [book],
    settings: appSettingsSchema.parse({
      activeBookId: book.id,
      lastChapterByBook: { [book.id]: chapters.at(-1)?.id },
      readingPositionByBook: { [book.id]: 0.38 },
    }),
    chapters: { [book.id]: chapters },
    characters: {
      [book.id]: [
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
      ],
    },
  };
}

export const seedRepositorySummary = {
  authors: 1,
  books: 1,
  chapters: chapterSeeds.length,
  characters: 1,
};
