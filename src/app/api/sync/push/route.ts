import { auth } from "@clerk/nextjs/server";
import { getAwthorDatabase } from "@/lib/database/mongodb";
import {
  ensureSyncIndexes,
  pushSyncRecords,
  StaleSyncDeletionError,
} from "@/lib/database/sync-records";
import { syncPushRequestSchema } from "@/lib/sync/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Sign in to sync." }, { status: 401 });

  const parsed = syncPushRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid sync payload." }, { status: 400 });

  try {
    const database = await getAwthorDatabase();
    await ensureSyncIndexes(database);
    return Response.json(
      await pushSyncRecords(database, userId, parsed.data.records, {
        baseCursor: parsed.data.baseCursor,
      }),
    );
  } catch (error) {
    if (error instanceof StaleSyncDeletionError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Sync is unavailable." },
      { status: 503 },
    );
  }
}
