import { z } from "zod";

export const themes = ["paper", "stone"] as const;
export const themeSchema = z.preprocess((value) => {
  if (value === "light") {
    return "paper";
  }

  if (value === "dark") {
    return "stone";
  }

  return value;
}, z.enum(themes));
export type Theme = z.infer<typeof themeSchema>;

export const bookProofreadingDialects = [
  "american",
  "british",
  "australian",
  "canadian",
  "indian",
] as const;

export const onboardingDetailsSchema = z.object({
  authorName: z.string().default(""),
  contactEmail: z.string().default(""),
  defaultProofreadingDialect: z.enum(bookProofreadingDialects).default("american"),
  theme: themeSchema.default("paper"),
  website: z.string().default(""),
});
export type OnboardingDetails = z.infer<typeof onboardingDetailsSchema>;

export const bookStatuses = ["Outline", "First draft", "Revision"] as const;
export const bookStatusSchema = z.enum(bookStatuses);

const nullableRemoteUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .url()
    .refine((value) => value.startsWith("https://") || value.startsWith("http://"), {
      message: "Only HTTP(S) URLs are supported.",
    })
    .nullable(),
);

export const bookSchema = z.object({
  id: z.string().min(1),
  slug: z.string().default(""),
  title: z.string().default("Untitled book"),
  author: z.string().default(""),
  coverUrl: nullableRemoteUrlSchema.default(null),
  subtitle: z.string().default(""),
  status: bookStatusSchema.default("First draft"),
  genre: z.string().default(""),
  subgenre: z.string().default(""),
  language: z.string().default("English"),
  chapterCount: z.number().int().nonnegative().default(0),
  pageCount: z.number().int().nonnegative().default(0),
  wordCount: z.number().int().nonnegative().default(0),
  characterCount: z.number().int().nonnegative().default(0),
  characterCountWithSpaces: z.number().int().nonnegative().default(0),
  preface: z.string().default(""),
  synopsis: z.string().default(""),
  isPartOfSeries: z.boolean().default(false),
  seriesName: z.string().default(""),
  seriesPosition: z.number().int().positive().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Book = z.infer<typeof bookSchema>;

export const bookProofreadingSettingsSchema = z.object({
  dialect: z.enum(bookProofreadingDialects).default("american"),
  words: z.array(z.string()).default([]),
});
export type BookProofreadingSettings = z.infer<typeof bookProofreadingSettingsSchema>;

export function createDefaultBookProofreadingSettings(
  dialect: BookProofreadingSettings["dialect"] = "american",
): BookProofreadingSettings {
  return bookProofreadingSettingsSchema.parse({ dialect });
}

export const appSettingsSchema = z.object({
  activeBookId: z.string().nullable().default(null),
  lastChapterByBook: z.record(z.string(), z.string()).default({}),
  readingPositionByBook: z.record(z.string(), z.number().finite().min(0).max(1)).default({}),
  proofreadingByBook: z.record(z.string(), bookProofreadingSettingsSchema).default({}),
  editor: z
    .object({
      fontFamily: z.string().default("serif"),
      fontSize: z.number().positive().default(18),
      lineHeight: z.number().positive().default(1.75),
      focusMode: z.boolean().default(false),
      spellcheck: z.boolean().default(true),
    })
    .default({
      fontFamily: "serif",
      fontSize: 18,
      lineHeight: 1.75,
      focusMode: false,
      spellcheck: true,
    }),
  backupReminder: z
    .object({
      enabled: z.boolean().default(true),
      frequency: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
      lastDismissedAt: z.string().nullable().default(null),
    })
    .default({ enabled: true, frequency: "weekly", lastDismissedAt: null }),
});
export type AppSettings = z.infer<typeof appSettingsSchema>;

export function createDefaultAppSettings(): AppSettings {
  return appSettingsSchema.parse({});
}

export function resolveBookProofreadingSettings(
  settings: AppSettings,
  profile: OnboardingDetails | null,
  bookId: string,
): BookProofreadingSettings {
  return (
    settings.proofreadingByBook[bookId] ??
    createDefaultBookProofreadingSettings(profile?.defaultProofreadingDialect)
  );
}

export const characterSchema = z.object({
  id: z.string().min(1),
  name: z.string().default("Unnamed character"),
  image: z.string().default(""),
  dob: z.string().default(""),
  location: z.string().default(""),
  language: z.string().default(""),
  physicalDescription: z.string().default(""),
  mentalDescription: z.string().default(""),
  characteristics: z.array(z.string()).default([]),
  storyRole: z.string().default(""),
  relationships: z.string().default(""),
  arc: z.string().default(""),
  hidden: z.boolean().default(false),
});
export type Character = z.infer<typeof characterSchema>;

export const chapterStatuses = ["Draft", "Revision", "Complete"] as const;
export const chapterStatusSchema = z.enum(chapterStatuses);
export type ChapterStatus = z.infer<typeof chapterStatusSchema>;

export const chapterArcStages = [
  "Unassigned",
  "Setup",
  "Rising action",
  "Midpoint",
  "Escalation",
  "Climax",
  "Resolution",
] as const;
export const chapterArcStageSchema = z.enum(chapterArcStages);
export type ChapterArcStage = z.infer<typeof chapterArcStageSchema>;

export const chapterArcSchema = z.object({
  stage: chapterArcStageSchema.default("Unassigned"),
  tension: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
    .default(3),
  goal: z.string().default(""),
  conflict: z.string().default(""),
  outcome: z.string().default(""),
});
export type ChapterArc = z.infer<typeof chapterArcSchema>;

export function createDefaultChapterArc(): ChapterArc {
  return chapterArcSchema.parse({});
}

const canonicalChapterSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  title: z.string().default("Untitled chapter"),
  summary: z.string().default(""),
  status: chapterStatusSchema.default("Draft"),
  wordCount: z.number().int().nonnegative().default(0),
  characterCount: z.number().int().nonnegative().default(0),
  characterCountWithSpaces: z.number().int().nonnegative().default(0),
  pov: z.string().default(""),
  body: z.string().default(""),
  arc: chapterArcSchema.default({
    stage: "Unassigned",
    tension: 3,
    goal: "",
    conflict: "",
    outcome: "",
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const chapterSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object") {
    return value;
  }

  const chapter = value as Record<string, unknown>;
  const epoch = new Date(0).toISOString();

  return {
    ...chapter,
    body: typeof chapter.body === "string" ? chapter.body : chapter.content,
    wordCount:
      typeof chapter.wordCount === "number"
        ? chapter.wordCount
        : typeof chapter.words === "number"
          ? chapter.words
          : 0,
    createdAt:
      typeof chapter.createdAt === "string"
        ? chapter.createdAt
        : typeof chapter.lastEdited === "string"
          ? chapter.lastEdited
          : epoch,
    updatedAt:
      typeof chapter.updatedAt === "string"
        ? chapter.updatedAt
        : typeof chapter.lastEdited === "string"
          ? chapter.lastEdited
          : epoch,
  };
}, canonicalChapterSchema);
export type Chapter = z.infer<typeof chapterSchema>;

export const workspaceModes = ["read", "write"] as const;
export type WorkspaceMode = (typeof workspaceModes)[number];

export const workspaceTools = ["spelling", "characters", "chapter-arc"] as const;
export type WorkspaceTool = (typeof workspaceTools)[number] | null;

export const saveStates = ["loading", "clean", "dirty", "saving", "saved", "error"] as const;
export type SaveState = (typeof saveStates)[number];
