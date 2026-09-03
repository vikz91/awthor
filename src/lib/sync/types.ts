import { z } from "zod";

export const syncRecordTypes = [
  "profile",
  "theme",
  "settings",
  "progress",
  "book",
  "chapter",
  "character",
] as const;
export type SyncRecordType = (typeof syncRecordTypes)[number];

export const activeReadingProgressPayloadSchema = z
  .object({
    activeBookId: z.string().nullable(),
    kind: z.literal("active"),
  })
  .strict();

export const bookReadingProgressPayloadSchema = z
  .object({
    bookId: z.string().min(1),
    chapterId: z.string().nullable(),
    kind: z.literal("book"),
    position: z.number().finite().min(0).max(1),
  })
  .strict();

export const readingProgressPayloadSchema = z.discriminatedUnion("kind", [
  activeReadingProgressPayloadSchema,
  bookReadingProgressPayloadSchema,
]);
export type ReadingProgressPayload = z.infer<typeof readingProgressPayloadSchema>;

export const syncRecordSchema = z.object({
  contentHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .or(z.literal(""))
    .default(""),
  deleted: z.boolean(),
  deviceId: z.string().min(1).max(128),
  modifiedAt: z.string().datetime(),
  payload: z.unknown().nullable(),
  recordId: z.string().min(1).max(256),
  recordType: z.enum(syncRecordTypes),
});
export type SyncRecord = z.infer<typeof syncRecordSchema>;

/** Device-local version metadata deliberately excludes manuscript payloads. */
export const syncRecordStateSchema = z.object({
  contentHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .or(z.literal(""))
    .default(""),
  deleted: z.boolean(),
  deviceId: z.string().min(1).max(128),
  modifiedAt: z.string().datetime(),
  recordId: z.string().min(1).max(256),
  recordType: z.enum(syncRecordTypes),
});
export type SyncRecordState = z.infer<typeof syncRecordStateSchema>;

export const syncDeleteIntentSchema = syncRecordStateSchema.extend({
  baseCursor: z.number().int().nonnegative(),
});
export type SyncDeleteIntent = z.infer<typeof syncDeleteIntentSchema>;

export const syncedRecordSchema = syncRecordSchema.extend({
  serverRevision: z.number().int().nonnegative(),
});
export type SyncedRecord = z.infer<typeof syncedRecordSchema>;

export const syncPushRequestSchema = z.object({
  baseCursor: z.number().int().nonnegative(),
  records: syncRecordSchema.array().min(1).max(50),
});

export const syncPushResponseSchema = z.object({
  cursor: z.number().int().nonnegative(),
  records: syncedRecordSchema.array(),
});

export const syncPullResponseSchema = z.object({
  cursor: z.number().int().nonnegative(),
  hasMore: z.boolean().default(false),
  records: syncedRecordSchema.array(),
});

export type SyncStatus = "idle" | "syncing" | "offline" | "error";

export type SyncDeviceState = {
  cursor: number;
  deviceId: string;
  lastAttemptAt: string | null;
  lastError: string | null;
  lastSuccessfulSyncAt: string | null;
  pendingDeletes: Record<string, SyncDeleteIntent>;
  records: Record<string, SyncRecordState>;
};

export const syncDeviceStateSchema = z.object({
  cursor: z.number().int().nonnegative().default(0),
  deviceId: z.string().min(1).max(128),
  lastAttemptAt: z.string().datetime().nullable().default(null),
  lastError: z.string().nullable().default(null),
  lastSuccessfulSyncAt: z.string().datetime().nullable().default(null),
  pendingDeletes: z.record(z.string(), syncDeleteIntentSchema).default({}),
  records: z.record(z.string(), syncRecordStateSchema).default({}),
});
