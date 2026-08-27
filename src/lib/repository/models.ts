import { z } from "zod";

export const themes = ["light", "dark", "paper"] as const;
export const themeSchema = z.enum(themes);
export type Theme = z.infer<typeof themeSchema>;

export const onboardingDetailsSchema = z.object({
  authorName: z.string(),
  backupReminder: z.boolean(),
  bio: z.string(),
  completedAt: z.string().nullable(),
  genres: z.array(z.string()),
  penName: z.string(),
  theme: themeSchema,
  writingExperience: z.string(),
  writingGoal: z.string(),
});
export type OnboardingDetails = z.infer<typeof onboardingDetailsSchema>;

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
