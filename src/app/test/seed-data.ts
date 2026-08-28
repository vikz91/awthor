import type { Character, Note, OnboardingDetails, PlotThread } from "@/lib/repository";

export const backupFormat = "awthor-local-storage-backup";
export const backupVersion = 1;
export const awthorStoragePrefix = "awthor";

const repositoryPrefix = "awthor:repository:v1";

export type AwthorBackup = {
  format: typeof backupFormat;
  version: typeof backupVersion;
  exportedAt: string;
  entries: Record<string, string>;
};

type SeedBook = {
  id: string;
  slug: string;
  title: string;
  author: string;
  subtitle: string;
  status: "Outline" | "First draft" | "Revision";
  genre: string;
  subgenre: string;
  language: string;
  chapterCount: number;
  pageCount: number;
  wordCount: number;
  characterCount: number;
  characterCountWithSpaces: number;
  preface: string;
  synopsis: string;
  isPartOfSeries: boolean;
  seriesName: string;
  seriesPosition: number | null;
  createdAt: string;
  updatedAt: string;
};

type SeedChapter = {
  id: string;
  bookId: string;
  number: number;
  title: string;
  status: "Draft" | "Revision" | "Complete";
  pov: string;
  summary: string;
  content: string;
  wordCount: number;
  characterCount: number;
  characterCountWithSpaces: number;
  createdAt: string;
  updatedAt: string;
};

const author: OnboardingDetails = {
  authorName: "Alex Parker",
  contactEmail: "alex.parker@example.com",
  theme: "paper",
  website: "https://alexparker.example",
};

const books: SeedBook[] = [
  {
    id: "the-long-way-home",
    slug: "the-long-way-home",
    title: "The Long Way Home",
    author: "Alex Parker",
    subtitle: "A quiet novel about distance, memory, and the roads that bring us back.",
    status: "First draft",
    genre: "Literary fiction",
    subgenre: "Contemporary family drama",
    language: "English (US)",
    chapterCount: 12,
    pageCount: 171,
    wordCount: 42680,
    characterCount: 213406,
    characterCountWithSpaces: 254781,
    preface:
      "Some journeys begin with a departure. This one began with a return. After seventeen years away, Mara Bell comes home to Stillwater carrying little more than a half-finished letter.",
    synopsis:
      "When a winter storm closes the only road out of Stillwater, Mara must confront the family she left behind and decide which parts of the past are worth carrying forward.",
    isPartOfSeries: true,
    seriesName: "The Stillwater Roads",
    seriesPosition: 1,
    createdAt: "2026-03-18T08:15:00.000Z",
    updatedAt: "2026-08-28T04:12:00.000Z",
  },
  {
    id: "saltwater-static",
    slug: "saltwater-static",
    title: "Saltwater Static",
    author: "Alex Parker",
    subtitle: "A coastal mystery about memory, signal, and the voices the tide returns.",
    status: "First draft",
    genre: "Mystery",
    subgenre: "Coastal psychological suspense",
    language: "English (US)",
    chapterCount: 6,
    pageCount: 73,
    wordCount: 18240,
    characterCount: 91204,
    characterCountWithSpaces: 108731,
    preface:
      "On certain nights, the old receiver catches voices beneath the weather report. Nora has spent years calling it interference—until one of those voices says her name.",
    synopsis:
      "A radio producer returns to the island where her sister vanished and discovers a repeating transmission that may connect three disappearances across forty years.",
    isPartOfSeries: false,
    seriesName: "",
    seriesPosition: null,
    createdAt: "2026-06-02T11:40:00.000Z",
    updatedAt: "2026-08-27T12:48:00.000Z",
  },
  {
    id: "paper-moons",
    slug: "paper-moons",
    title: "Paper Moons",
    author: "Alex Parker",
    subtitle: "A second-chance romance written in letters, borrowed light, and impossible timing.",
    status: "Revision",
    genre: "Romance",
    subgenre: "Second-chance contemporary romance",
    language: "English (US)",
    chapterCount: 22,
    pageCount: 284,
    wordCount: 71010,
    characterCount: 355084,
    characterCountWithSpaces: 423960,
    preface:
      "June kept every letter except the one she meant to send. Ten years later, it arrives at Theo's door with no postmark and a date that has not happened yet.",
    synopsis:
      "Two former sweethearts reconnect through a box of undelivered letters and must decide whether knowing how their story might end makes beginning again easier or impossible.",
    isPartOfSeries: true,
    seriesName: "The Lunar Letters",
    seriesPosition: 2,
    createdAt: "2026-01-11T07:20:00.000Z",
    updatedAt: "2026-08-25T16:05:00.000Z",
  },
  {
    id: "wildlight-orchard",
    slug: "wildlight-orchard",
    title: "Wildlight Orchard",
    author: "Alex Parker",
    subtitle: "A folkloric fantasy about a harvest that remembers every promise made beneath it.",
    status: "Outline",
    genre: "Fantasy",
    subgenre: "Folkloric cozy fantasy",
    language: "English (US)",
    chapterCount: 3,
    pageCount: 20,
    wordCount: 4890,
    characterCount: 24612,
    characterCountWithSpaces: 29404,
    preface:
      "The orchard blooms only once every seven years, and each fruit carries the memory of the person who planted its seed. This year, one tree remembers a murder.",
    synopsis:
      "An apprentice orchard keeper investigates an impossible memory while protecting a magical harvest from the family that believes it belongs to them.",
    isPartOfSeries: false,
    seriesName: "",
    seriesPosition: null,
    createdAt: "2026-08-19T06:55:00.000Z",
    updatedAt: "2026-08-22T10:25:00.000Z",
  },
];

const chapterTitles: Record<string, string[]> = {
  "the-long-way-home": [
    "The Letter",
    "Northbound",
    "A Familiar Face",
    "The Crossing",
    "Stillwater",
    "The House on Alder Street",
    "Things We Left Behind",
    "A Road Closed",
    "The Winter Kitchen",
    "What June Remembered",
    "The Unsent Page",
    "The Road at Dusk",
  ],
  "saltwater-static": [
    "Dead Air",
    "The Night Frequency",
    "Low Tide",
    "Relay House",
    "A Voice in the Weather",
    "Voices Under Weather",
  ],
  "paper-moons": [
    "Return to Sender",
    "A Box in June",
    "The First Postmark",
    "Borrowed Light",
    "Ten Years Earlier",
    "The Café on Mercer",
    "A Letter Never Sent",
    "Theo's Margins",
    "Waxing",
    "The Wrong Address",
    "What We Nearly Said",
    "The Blue Envelope",
    "A Future Date",
    "Paper Constellations",
    "The Longest Tuesday",
    "Without a Postmark",
    "June Writes Back",
    "The Shape of Maybe",
    "An Honest Beginning",
    "The Last Undelivered Letter",
    "Tomorrow's Moon",
    "The Letter Dated Tomorrow",
  ],
  "wildlight-orchard": ["The Seventh Bloom", "Fruit of Memory", "A Memory in the Roots"],
};

const chapterOpenings: Record<string, string> = {
  "the-long-way-home":
    "The train slipped out of the city before Mara could decide whether leaving counted as courage or surrender.",
  "saltwater-static":
    "At 2:17 in the morning, the receiver found a voice underneath the marine forecast.",
  "paper-moons": "June knew the handwriting before she knew why the envelope made her hands shake.",
  "wildlight-orchard":
    "By dawn, every tree in the eastern row had bloomed except the one that remembered blood.",
};

const castByBook: Record<string, Array<{ name: string; role: string; location: string }>> = {
  "the-long-way-home": [
    { name: "Mara Bell", role: "Protagonist", location: "Stillwater, Vermont" },
    { name: "June Bell", role: "Mentor", location: "Stillwater, Vermont" },
    { name: "Samuel Reed", role: "Love interest", location: "Stillwater, Vermont" },
    { name: "Gideon Price", role: "Antagonist", location: "Stillwater, Vermont" },
  ],
  "saltwater-static": [
    { name: "Nora Voss", role: "Protagonist", location: "Greyhaven Island" },
    { name: "Mina Voss", role: "Missing sister", location: "Greyhaven Island" },
    { name: "Elias Ward", role: "Ally", location: "Greyhaven Island" },
    { name: "Dr. Celia Rook", role: "Antagonist", location: "Port Calder" },
  ],
  "paper-moons": [
    { name: "June Arlen", role: "Protagonist", location: "Bellweather, Maine" },
    { name: "Theo Mercer", role: "Love interest", location: "Bellweather, Maine" },
    { name: "Lina Shah", role: "Confidante", location: "Boston, Massachusetts" },
    { name: "Martin Arlen", role: "Parent", location: "Bellweather, Maine" },
  ],
  "wildlight-orchard": [
    { name: "Iona Vale", role: "Protagonist", location: "Briarhollow" },
    { name: "Tomas Fen", role: "Mentor", location: "Wildlight Orchard" },
    { name: "Merrit Ash", role: "Rival", location: "Briarhollow" },
    { name: "Lady Rowan", role: "Antagonist", location: "Rowan House" },
  ],
};

function storedEnvelope(payload: unknown, savedAt: string) {
  return JSON.stringify({
    schemaVersion: 1,
    savedAt,
    payload,
  });
}

function countWords(content: string) {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

function createChapters(book: SeedBook): SeedChapter[] {
  const titles = chapterTitles[book.id];
  const opening = chapterOpenings[book.id];

  return titles.map((title, index) => {
    const chapterNumber = index + 1;
    const isLatest = chapterNumber === titles.length;
    const isRevision = chapterNumber === titles.length - 1;
    const content = [
      opening,
      "Beyond the immediate moment, the world kept moving with the quiet certainty of weather. Every familiar detail seemed to hold a second meaning now.",
      "The choice ahead was simple enough to name and impossible to make. For a while, the only honest thing to do was stay with the silence.",
      "This seeded manuscript includes realistic chapter content so export, import, editing, counting, and migration flows can be exercised without using personal writing.",
    ].join("\n\n");

    return {
      id: `${book.id}-chapter-${chapterNumber}`,
      bookId: book.id,
      number: chapterNumber,
      title,
      status: isLatest ? "Draft" : isRevision ? "Revision" : "Complete",
      pov: castByBook[book.id][0].name,
      summary:
        "Chapter " +
        chapterNumber +
        " advances the central conflict in " +
        book.title +
        " and leaves a clear emotional turn for the next scene.",
      content,
      wordCount: isLatest ? countWords(content) : 2400 + chapterNumber * 137,
      characterCount: content.replace(/\s/g, "").length,
      characterCountWithSpaces: content.length,
      createdAt: "2026-03-18T08:15:00.000Z",
      updatedAt: isLatest ? "2026-08-28T04:12:00.000Z" : "2026-08-20T12:00:00.000Z",
    };
  });
}

function createCharacters(book: SeedBook): Character[] {
  return castByBook[book.id].map((character, index) => ({
    id: `${book.id}-character-${index + 1}`,
    name: character.name,
    image: `https://i.pravatar.cc/160?img=${12 + index * 7}`,
    dob: `198${index}-0${index + 2}-1${index}`,
    location: character.location,
    language: index % 2 === 0 ? "English" : "English, French",
    physicalDescription:
      "A grounded, distinctive presence with practical clothes and a face that reveals more in silence than in conversation.",
    mentalDescription:
      "Observant and guarded under pressure; notices patterns quickly but avoids naming personal fears.",
    characteristics: ["Perceptive", index % 2 === 0 ? "Patient" : "Restless", "Loyal"],
    storyRole: character.role,
    relationships:
      "Connected to the protagonist through shared history, an unresolved promise, and conflicting ideas about what loyalty requires.",
    arc: "Moves from protecting an old version of the truth toward choosing a more honest relationship with the people around them.",
    hidden: false,
  }));
}

function createPlots(book: SeedBook): PlotThread[] {
  const protagonist = castByBook[book.id][0].name;
  const antagonist = castByBook[book.id][3].name;

  return [
    {
      id: `${book.id}-main-plot`,
      title: "The central truth comes to light",
      type: "Main plot",
      status: "In progress",
      tension: "High",
      summary:
        protagonist +
        " follows a trail of partial truths toward the event everyone else has agreed to forget.",
      stakes:
        "Failure would cost the protagonist both the place they came to protect and the last relationship that still feels like home.",
      characters: [protagonist, antagonist],
      startChapter: 1,
      endChapter: book.chapterCount,
      beats: [
        {
          id: `${book.id}-beat-inciting`,
          title: "The first contradiction appears",
          chapter: 2,
          complete: true,
        },
        {
          id: `${book.id}-beat-midpoint`,
          title: "An ally reveals what they withheld",
          chapter: Math.max(3, Math.round(book.chapterCount / 2)),
          complete: book.status === "Revision",
        },
        {
          id: `${book.id}-beat-climax`,
          title: "The truth must be made public",
          chapter: book.chapterCount,
          complete: false,
        },
      ],
    },
    {
      id: `${book.id}-character-arc`,
      title: `${protagonist} chooses what home means`,
      type: "Character arc",
      status: book.status === "Outline" ? "Planned" : "In progress",
      tension: "Rising",
      summary:
        "The protagonist gradually separates the place itself from the grief and expectations attached to it.",
      stakes:
        "Without that change, solving the external problem will still leave the protagonist repeating the same retreat.",
      characters: [protagonist],
      startChapter: 1,
      endChapter: book.chapterCount,
      beats: [
        {
          id: `${book.id}-arc-arrival`,
          title: "Arrival is treated as temporary",
          chapter: 1,
          complete: true,
        },
        {
          id: `${book.id}-arc-choice`,
          title: "A deliberate reason to stay",
          chapter: book.chapterCount,
          complete: false,
        },
      ],
    },
  ];
}

function createNotes(book: SeedBook): Note[] {
  return [
    {
      id: `${book.id}-note-research`,
      title: "Research questions",
      body: "Verify travel times, seasonal weather, and the practical details that shape the setting. Flag any fact that needs a primary source before the revision pass.",
      category: "Research",
      relatedTo: book.title,
      updatedAt: "Today, 10:20 AM",
      pinned: true,
      archived: false,
    },
    {
      id: `${book.id}-note-scene`,
      title: "Scene to revisit",
      body: "Let the argument happen while both characters are occupied with an ordinary task. Keep the subtext sharper than the spoken conflict.",
      category: "Scene idea",
      relatedTo: "Midpoint",
      updatedAt: "Yesterday, 6:45 PM",
      pinned: false,
      archived: false,
    },
    {
      id: `${book.id}-note-world`,
      title: "Setting texture",
      body: "Collect recurring sounds, smells, local habits, and objects that make the setting recognizable without slowing the scene.",
      category: "Worldbuilding",
      relatedTo: book.genre,
      updatedAt: "August 24, 2026",
      pinned: false,
      archived: false,
    },
  ];
}

export function createSeedStorageEntries(savedAt = "2026-08-28T09:30:00.000Z") {
  const entries: Record<string, string> = {
    "awthor-theme": author.theme,
    [`${repositoryPrefix}:profile`]: storedEnvelope(author, savedAt),
    [`${repositoryPrefix}:books`]: storedEnvelope(books, savedAt),
    [`${repositoryPrefix}:settings`]: storedEnvelope(
      {
        activeBookId: "the-long-way-home",
        editor: {
          fontFamily: "serif",
          fontSize: 18,
          lineHeight: 1.75,
          focusMode: false,
          spellcheck: true,
        },
        backupReminder: {
          enabled: true,
          frequency: "weekly",
          lastDismissedAt: null,
        },
      },
      savedAt,
    ),
  };

  for (const book of books) {
    const scope = encodeURIComponent(book.id);
    entries[`${repositoryPrefix}:chapters:${scope}`] = storedEnvelope(
      createChapters(book),
      savedAt,
    );
    entries[`${repositoryPrefix}:characters:${scope}`] = storedEnvelope(
      createCharacters(book),
      savedAt,
    );
    entries[`${repositoryPrefix}:plots:${scope}`] = storedEnvelope(createPlots(book), savedAt);
    entries[`${repositoryPrefix}:notes:${scope}`] = storedEnvelope(createNotes(book), savedAt);
  }

  return entries;
}

export function createBackup(
  entries: Record<string, string>,
  exportedAt = new Date().toISOString(),
): AwthorBackup {
  return {
    format: backupFormat,
    version: backupVersion,
    exportedAt,
    entries,
  };
}

export const seedSummary = {
  authors: 1,
  books: books.length,
  chapters: books.reduce((total, book) => total + book.chapterCount, 0),
  characters: books.reduce((total, book) => total + castByBook[book.id].length, 0),
  plots: books.length * 2,
  notes: books.length * 3,
};
