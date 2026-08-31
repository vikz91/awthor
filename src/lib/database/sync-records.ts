import "server-only";

import type { Collection, Db } from "mongodb";
import { compareSyncRecords } from "@/lib/sync/records";
import { type SyncedRecord, type SyncRecord, syncedRecordSchema } from "@/lib/sync/types";

type StoredSyncRecord = SyncedRecord & { userId: string };

function collection(database: Db): Collection<StoredSyncRecord> {
  return database.collection<StoredSyncRecord>("syncRecords");
}

export async function ensureSyncIndexes(database: Db) {
  await collection(database).createIndex(
    { recordId: 1, recordType: 1, userId: 1 },
    { name: "sync_record_owner", unique: true },
  );
  await collection(database).createIndex({ serverRevision: 1, userId: 1 }, { name: "sync_cursor" });
}

export async function pushSyncRecords(
  database: Db,
  userId: string,
  records: readonly SyncRecord[],
) {
  const recordsCollection = collection(database);
  const winners: SyncedRecord[] = [];
  let cursor = 0;

  for (const record of records) {
    const existing = await recordsCollection.findOne({
      recordId: record.recordId,
      recordType: record.recordType,
      userId,
    });
    const incomingWins = !existing || compareSyncRecords(record, existing) > 0;
    const winner = incomingWins
      ? { ...record, serverRevision: Date.now() }
      : syncedRecordSchema.parse(existing);

    if (incomingWins) {
      await recordsCollection.updateOne(
        { recordId: record.recordId, recordType: record.recordType, userId },
        { $set: { ...winner, userId } },
        { upsert: true },
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
    records: records.map((record) => syncedRecordSchema.parse(record)),
  };
}
