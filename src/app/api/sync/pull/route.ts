import { auth } from "@clerk/nextjs/server";
import { getAwthorDatabase } from "@/lib/database/mongodb";
import { ensureSyncIndexes, pullSyncRecords } from "@/lib/database/sync-records";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Sign in to sync." }, { status: 401 });

  const cursor = Number(new URL(request.url).searchParams.get("cursor") ?? "0");
  if (!Number.isSafeInteger(cursor) || cursor < 0) {
    return Response.json({ error: "Invalid sync cursor." }, { status: 400 });
  }

  try {
    const database = await getAwthorDatabase();
    await ensureSyncIndexes(database);
    return Response.json(await pullSyncRecords(database, userId, cursor));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Sync is unavailable." },
      { status: 503 },
    );
  }
}
