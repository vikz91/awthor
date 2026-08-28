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

export const onboardingDetailsSchema = z.object({
  authorName: z.string(),
  contactEmail: z.string().default(""),
  theme: themeSchema,
  website: z.string().default(""),
});
export type OnboardingDetails = z.infer<typeof onboardingDetailsSchema>;

export const bookStatuses = ["Outline", "First draft", "Revision"] as const;
export const bookStatusSchema = z.enum(bookStatuses);

export const bookSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  author: z.string(),
  subtitle: z.string(),
  status: bookStatusSchema,
  genre: z.string(),
  subgenre: z.string(),
  language: z.string(),
  chapterCount: z.number().int().nonnegative(),
  pageCount: z.number().int().nonnegative(),
  wordCount: z.number().int().nonnegative(),
  characterCount: z.number().int().nonnegative(),
  characterCountWithSpaces: z.number().int().nonnegative(),
  preface: z.string(),
  synopsis: z.string(),
  isPartOfSeries: z.boolean(),
  seriesName: z.string(),
  seriesPosition: z.number().int().positive().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Book = z.infer<typeof bookSchema>;

export const appSettingsSchema = z.object({
  activeBookId: z.string().nullable(),
  editor: z.object({
    fontFamily: z.string(),
    fontSize: z.number().positive(),
    lineHeight: z.number().positive(),
    focusMode: z.boolean(),
    spellcheck: z.boolean(),
  }),
  backupReminder: z.object({
    enabled: z.boolean(),
    frequency: z.enum(["daily", "weekly", "monthly"]),
    lastDismissedAt: z.string().nullable(),
  }),
});
export type AppSettings = z.infer<typeof appSettingsSchema>;

export const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  dob: z.string(),
  location: z.string(),
  language: z.string(),
  physicalDescription: z.string(),
  mentalDescription: z.string(),
  characteristics: z.array(z.string()),
  storyRole: z.string(),
  relationships: z.string(),
  arc: z.string(),
  hidden: z.boolean(),
});
export type Character = z.infer<typeof characterSchema>;

export const chapterStatuses = ["Draft", "Revision", "Complete"] as const;
export const chapterStatusSchema = z.enum(chapterStatuses);
export type ChapterStatus = z.infer<typeof chapterStatusSchema>;

const workspaceChapterSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  title: z.string(),
  summary: z.string(),
  status: chapterStatusSchema,
  words: z.number().int().nonnegative(),
  pov: z.string(),
  body: z.string(),
  lastEdited: z.string(),
});

const seededChapterSchema = z
  .object({
    id: z.string(),
    bookId: z.string(),
    number: z.number().int().positive(),
    title: z.string(),
    summary: z.string(),
    status: chapterStatusSchema,
    wordCount: z.number().int().nonnegative(),
    characterCount: z.number().int().nonnegative(),
    characterCountWithSpaces: z.number().int().nonnegative(),
    pov: z.string(),
    content: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .transform((chapter) => ({
    id: chapter.id,
    number: chapter.number,
    title: chapter.title,
    summary: chapter.summary,
    status: chapter.status,
    words: chapter.wordCount,
    pov: chapter.pov,
    body: chapter.content,
    lastEdited: chapter.updatedAt,
  }));

export const chapterSchema = z.union([workspaceChapterSchema, seededChapterSchema]);
export type Chapter = z.infer<typeof chapterSchema>;

export const plotTypes = ["Main plot", "Subplot", "Character arc", "Mystery thread"] as const;
export const plotStatuses = ["Planned", "In progress", "Resolved"] as const;
export const tensionLevels = ["Quiet", "Rising", "High", "Climax"] as const;

export const plotTypeSchema = z.enum(plotTypes);
export const plotStatusSchema = z.enum(plotStatuses);
export const tensionSchema = z.enum(tensionLevels);

export type PlotType = z.infer<typeof plotTypeSchema>;
export type PlotStatus = z.infer<typeof plotStatusSchema>;
export type Tension = z.infer<typeof tensionSchema>;

export const plotBeatSchema = z.object({
  id: z.string(),
  title: z.string(),
  chapter: z.number().int().nonnegative(),
  complete: z.boolean(),
});
export type PlotBeat = z.infer<typeof plotBeatSchema>;

export const plotThreadSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: plotTypeSchema,
  status: plotStatusSchema,
  tension: tensionSchema,
  summary: z.string(),
  stakes: z.string(),
  characters: z.array(z.string()),
  startChapter: z.number().int().nonnegative(),
  endChapter: z.number().int().nonnegative(),
  beats: z.array(plotBeatSchema),
});
export type PlotThread = z.infer<typeof plotThreadSchema>;

export const noteCategories = ["Research", "Scene idea", "Worldbuilding", "To-do"] as const;
export const noteCategorySchema = z.enum(noteCategories);
export type NoteCategory = z.infer<typeof noteCategorySchema>;

export const noteSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  category: noteCategorySchema,
  relatedTo: z.string(),
  updatedAt: z.string(),
  pinned: z.boolean(),
  archived: z.boolean(),
});
export type Note = z.infer<typeof noteSchema>;
