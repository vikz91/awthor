import { auth } from "@clerk/nextjs/server";
import { getSyncAccountAccess, syncAccessDeniedMessage } from "@/lib/auth/sync-access";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Sign in to sync." }, { status: 401 });

  try {
    const access = await getSyncAccountAccess(userId);
    if (access !== "authorized") {
      return Response.json({ error: syncAccessDeniedMessage }, { status: 403 });
    }
    return Response.json({ authorized: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "Sync account access is temporarily unavailable." },
      { status: 503 },
    );
  }
}
