import "server-only";

import type { ClientSession, Collection, Db } from "mongodb";
import { compareSyncRecords, createSyncContentHash } from "@/lib/sync/records";
import { type SyncedRecord, type SyncRecord, syncedRecordSchema } from "@/lib/sync/types";

type StoredSyncRecord = SyncedRecord & { userId: string };
type SyncCounter = { _id: "syncRecords"; value: number };

const initializedDatabases = new Map<string, Promise<void>>();

function collection(database: Db): Collection<StoredSyncRecord> {
  return database.collection<StoredSyncRecord>("syncRecords");
}

function counters(database: Db): Collection<SyncCounter> {
  return database.collection<SyncCounter>("syncCounters");
}

export async function ensureSyncIndexes(database: Db) {
  const cacheKey = database.databaseName;
  const existing = initializedDatabases.get(cacheKey);
  if (existing) return existing;

  const initialization = (async () => {
    await collection(database).createIndex(
      { userId: 1, recordType: 1, recordId: 1 },
      { name: "sync_record_owner_v2", unique: true },
    );
    await collection(database).createIndex(
      { userId: 1, serverRevision: 1 },
      { name: "sync_cursor_v2" },
    );

    // Existing deployments used Date.now() directly. Seed the counter above any
    // previously issued revision before allocating the first monotonic value.
    const latest = await collection(database)
      .find({}, { projection: { serverRevision: 1 } })
      .sort({ serverRevision: -1 })
      .limit(1)
      .next();
    await counters(database).updateOne(
      { _id: "syncRecords" },
      { $max: { value: Math.max(latest?.serverRevision ?? 0, Date.now() - 1) } },
      { upsert: true },
    );
  })();
  initializedDatabases.set(cacheKey, initialization);
  try {
    await initialization;
  } catch (error) {
    initializedDatabases.delete(cacheKey);
    throw error;
  }
}

/**
 * Allocates a globally increasing cursor. A counter avoids the same-millisecond
 * collision that Date.now() caused across a batch or concurrent server instance.
 */
async function nextServerRevision(database: Db, session?: ClientSession) {
  const result = await counters(database).findOneAndUpdate(
    { _id: "syncRecords" },
    [
      {
        $set: {
          value: {
            $add: [{ $max: [{ $ifNull: ["$value", 0] }, Date.now() - 1] }, 1],
          },
        },
      },
    ],
    { returnDocument: "after", session, upsert: true },
  );
  if (!result) throw new Error("Could not allocate a sync cursor.");
  return result.value;
}

export async function pushSyncRecords(
  database: Db,
  userId: string,
  records: readonly SyncRecord[],
  options: { session?: ClientSession } = {},
) {
  const recordsCollection = collection(database);
  const winners: SyncedRecord[] = [];
  let cursor = 0;

  for (const record of records) {
    const canonicalRecord = {
      ...record,
      contentHash: await createSyncContentHash(record.payload),
    };
    const existing = await recordsCollection.findOne(
      {
        recordId: canonicalRecord.recordId,
        recordType: canonicalRecord.recordType,
        userId,
      },
      { session: options.session },
    );
    const incomingWins = !existing || compareSyncRecords(canonicalRecord, existing) > 0;
    const winner = incomingWins
      ? { ...canonicalRecord, serverRevision: await nextServerRevision(database, options.session) }
      : syncedRecordSchema.parse(existing);

    if (incomingWins) {
      await recordsCollection.updateOne(
        { recordId: canonicalRecord.recordId, recordType: canonicalRecord.recordType, userId },
        { $set: { ...winner, userId } },
        { session: options.session, upsert: true },
      );
    }
    winners.push(winner);
    cursor = Math.max(cursor, winner.serverRevision);
  }

  return { cursor, records: winners };
}

export async function pullSyncRecords(database: Db, userId: string, cursor: number) {
  const records = await collection(database)
    .find({ serverRevision: { $gt: cursor }, userId })
    .sort({ serverRevision: 1 })
    .limit(1000)
    .toArray();
  return {
    cursor: records.reduce((latest, record) => Math.max(latest, record.serverRevision), cursor),
    hasMore: records.length === 1000,
    records: records.map((record) => syncedRecordSchema.parse(record)),
  };
}

/**
 * Reads an account's complete canonical workspace. This is deliberately
 * server-only and is used by authenticated product services, never by the
 * browser repository.
 */
export async function listUserSyncRecords(
  database: Db,
  userId: string,
  options: { session?: ClientSession } = {},
) {
  const records = await collection(database)
    .find({ userId }, { session: options.session })
    .sort({ recordType: 1, recordId: 1 })
    .limit(10_000)
    .toArray();
  return records.map((record) => syncedRecordSchema.parse(record));
}
